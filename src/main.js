import { Battlefield } from './render.js';
import { act, createMission, selectUnit, stepMission } from './mission.js';
import { Interface, lessons } from './ui.js';
import { bindInput } from './input.js';
import { newProfile, readProfile, writeProfile } from './profile.js';
import { campaign, commands, missionSpec } from './config.js';
import { availableLevel, briefings, buyUpgrade, cast, completeLevel } from './campaign.js';
import { actor } from './units.js';
import { distanceSquared, updatePlayer } from './player.js';
import { GameAudio } from './audio.js';
import { t } from './locale.js';

const storage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value)
};

let profile = readProfile(storage);
let state = createMission(0, profile);
let mode = 'home';
let screen = 'home';
let settingsBack = 'home';
let dialogue;
let destination = 1;
let lesson = 0;
let lessonPassed = false;
let lessonDistance = 0;
let aiming = false;
let lastSave = 0;
let simulationDebt = 0;
let resultReward = 0;
let resultSaved = false;

const canvas = document.getElementById('arena');
const ui = new Interface(handleAction, setChoice, profile.settings);
const audio = new GameAudio(profile.settings);
let view;
try {
  view = new Battlefield(canvas);
} catch (error) {
  console.error(error);
  ui.unsupported();
}

function active() {
  return screen === null && ['battle', 'training', 'hub'].includes(mode);
}
const input = bindInput(ui.root, active, handleAction);

function changeScene(levelId, nextMode, checkpoint) {
  state = checkpoint ?? createMission(levelId, profile);
  mode = nextMode;
  screen = null;
  simulationDebt = 0;
  lastSave = performance.now();
  input.clear();
  setAiming(false);
  ui.clearNotice();
  ui.showLesson(-1);
  ui.hideMenu();
  view.setWorld(missionSpec(state));
}

function enterHub() {
  if (mode === 'battle') writeProfile(storage, profile, state);
  changeScene(0, 'hub');
  state.npcs = Object.entries(cast).map(([npc, spec], index) => ({
    ...actor('npc', 900 + index, spec.x, spec.z, 1), npc
  }));
  profile.started = true;
  writeProfile(storage, profile);
}

function enterBattle(id, checkpoint) {
  if (!availableLevel(profile, id)) return;
  changeScene(id, 'battle', checkpoint);
  if (!checkpoint) ui.notify('missionStart');
  profile.started = true;
  writeProfile(storage, profile, state);
}

function enterTraining() {
  changeScene(1, 'training');
  const mira = cast.mira;
  state.npcs = [{ ...actor('npc', 900, 2.1, 4.7, 1), npc: 'mira', name: mira.name }];
  lesson = 0;
  lessonPassed = false;
  lessonDistance = 0;
  ui.showLesson(lesson, lessonPassed);
}

function finishTraining() {
  profile.tutorial = true;
  enterBattle(1);
}

function passLesson() {
  if (lessonPassed || mode !== 'training') return;
  lessonPassed = true;
  ui.showLesson(lesson, true);
}

function nextLesson() {
  if (!lessonPassed) return;
  lesson += 1;
  if (lesson === lessons.length) {
    finishTraining();
    return;
  }
  lessonPassed = lesson === 7;
  if (lesson === 4) {
    const ally = state.allies[0];
    act(state, 'defend');
    const target = actor('enemy', state.nextId++, ally.x, ally.z - 2.6, 45);
    target.hp = 15;
    target.type = 'raider';
    state.enemies.push(target);
  }
  ui.showLesson(lesson, lessonPassed);
}

function setChoice(key, value) {
  if (key === 'element') {
    if (value >= 1 && value <= state.roster) state.element = value;
    ui.sync(state, aiming);
    return;
  }
  profile.settings[key] = value;
  if (['quality', 'limit', 'display'].includes(key)) view?.setSettings(profile.settings);
  if (key === 'movement' || key === 'locale') {
    input.clear();
    ui.localize(profile.settings);
    ui.sync(state, aiming);
    if (key === 'locale') ui.settings(profile.settings);
  }
  writeProfile(storage, profile, mode === 'battle' ? state : profile.mission);
}

function setAiming(value) {
  aiming = value;
  ui.aiming(value);
  ui.sync(state, aiming);
}

function showScreen(name) {
  screen = name;
  input.clear();
  setAiming(false);
  ui.clearNotice();
  ui.showLesson(-1);
  if (name === 'home') ui.home(profile);
  if (name === 'reset') ui.resetPrompt();
  if (name === 'map') ui.map(profile);
  if (name === 'shop') ui.shop(profile);
  if (name === 'collection') ui.collection(profile);
  if (name === 'settings') ui.settings(profile.settings);
  if (name === 'pause') {
    const saved = mode !== 'battle' || writeProfile(storage, profile, state);
    ui.pause(saved, mode === 'training');
  }
  if (name === 'result') ui.result(state, resultReward, resultSaved);
  if (name === 'dialogue') {
    const { lines, index, finalAction, finalKey, label } = dialogue;
    ui.dialogue(lines[index], index === lines.length - 1, finalAction, finalKey, label);
  }
}

function resume() {
  screen = null;
  simulationDebt = 0;
  ui.hideMenu();
  if (mode === 'training') ui.showLesson(lesson, lessonPassed);
}

function back() {
  if (screen === 'home') return;
  if (screen === 'settings') {
    showScreen(settingsBack);
  } else if (screen === 'reset') {
    showScreen('home');
  } else if (screen === 'shop' || screen === 'collection') {
    showScreen('map');
  } else if (screen === 'dialogue' && dialogue.finalAction === 'depart') {
    showScreen('map');
  } else if (mode === 'result') {
    showScreen('result');
  } else {
    resume();
  }
}

function talk(lines, finalAction, finalKey, label) {
  dialogue = { lines, index: 0, finalAction, finalKey, label };
  showScreen('dialogue');
}

function nearby() {
  return state.npcs?.find(npc => distanceSquared(npc, state.player) < 3.6 ** 2);
}

function interact() {
  if (mode === 'battle') {
    const result = act(state, 'chill');
    ui.notify(result.ok ? 'message_chill' : 'noInteraction');
    return;
  }
  const npc = nearby();
  if (!npc) {
    ui.notify('noInteraction');
    return;
  }
  if (mode === 'training' && lesson === 2) passLesson();
  const key = 'talk' + npc.npc[0].toUpperCase() + npc.npc.slice(1);
  talk([[npc.npc, t(key)]], npc.npc === 'tess' ? 'shop' : 'closeDialogue', npc.npc === 'tess' ? 'shop' : 'back', t('opening'));
}

function resolveAction(action, point) {
  const result = act(state, action, point);
  ui.notify(result.ok ? 'message_' + result.key : result.key, result);
  ui.sync(state, aiming);
  if (result.ok) audio.cue(action);
  if (!result.ok || mode !== 'training') return;
  if ((lesson === 3 && action === 'summon') ||
      (lesson === 5 && commands.includes(action) && action !== 'defend') ||
      (lesson === 6 && action === 'defend')) passLesson();
}

function handleAction(action) {
  if (!view) return;
  audio.cue('ui');
  const [name, arg] = action.split(':');
  if (name === 'new') {
    if (profile.started) showScreen('reset');
    else enterHub();
  } else if (name === 'confirmNew') {
    profile = newProfile(profile.settings);
    audio.settings = profile.settings;
    enterHub();
  } else if (name === 'continue') {
    if (profile.mission) enterBattle(profile.mission.levelId, profile.mission);
    else enterHub();
  } else if (name === 'training') {
    enterTraining();
  } else if (name === 'skipHome') {
    profile.tutorial = true;
    enterHub();
  } else if (name === 'settings') {
    settingsBack = screen ?? 'pause';
    showScreen('settings');
  } else if (name === 'back') {
    back();
  } else if (name === 'line') {
    dialogue.index++;
    showScreen('dialogue');
  } else if (name === 'closeDialogue' || name === 'resume') {
    resume();
  } else if (name === 'hub') {
    enterHub();
  } else if (name === 'titleScreen') {
    if (mode === 'battle') writeProfile(storage, profile, state);
    changeScene(0, 'home');
    showScreen('home');
  } else if (name === 'map') {
    if (mode === 'battle') writeProfile(storage, profile, state);
    showScreen('map');
  } else if (name === 'shop' || name === 'collection') {
    showScreen(name);
  } else if (name === 'buy') {
    if (buyUpgrade(profile, arg)) {
      audio.cue('upgrade');
      writeProfile(storage, profile);
      showScreen('shop');
    }
  } else if (name === 'travel' && availableLevel(profile, Number(arg))) {
    destination = Number(arg);
    if (profile.completed.includes(destination)) {
      enterBattle(destination);
    } else {
      const map = campaign[destination - 1];
      talk(briefings[destination - 1], 'depart', 'startMission', map.title);
    }
  } else if (name === 'depart') {
    enterBattle(destination);
  } else if (name === 'restart') {
    if (mode === 'training') enterTraining();
    else enterBattle(state.levelId);
  } else if (name === 'resumeSaved' && profile.mission) {
    enterBattle(profile.mission.levelId, profile.mission);
  } else if (!active()) {
    return;
  } else if (name === 'skip' && mode === 'training') {
    finishTraining();
  } else if (name === 'next' && mode === 'training') {
    nextLesson();
  } else if (name === 'zoomIn' || name === 'zoomOut') {
    view.view.adjust(name === 'zoomIn' ? 1.18 : 1 / 1.18);
    if (mode === 'training' && lesson === 1) passLesson();
  } else if (name === 'pause' || (name === 'escape' && !aiming)) {
    showScreen(mode === 'hub' ? 'map' : 'pause');
  } else if (name === 'run') {
    ui.root.querySelector('[data-action="run"]').setAttribute('aria-pressed', String(input.toggleRun()));
  } else if (name === 'interact') {
    interact();
  } else if (mode === 'hub') {
    return;
  } else if (name === 'all') {
    state.selected.length = 0;
  } else if (name === 'escape' || name === 'move') {
    setAiming(name === 'move' && !aiming);
    ui.notify(aiming ? 'chooseMove' : 'moveCanceled', {}, aiming);
  } else if (commands.includes(name) || ['pulse', 'summon', 'upgrade', 'strike'].includes(name)) {
    setAiming(false);
    resolveAction(name);
  }
}

canvas.addEventListener('pointerup', event => {
  if (!active() || event.button !== 0) return;
  const point = view.projectToGround(event.clientX, event.clientY);
  if (!point) return;
  if (aiming) {
    setAiming(false);
    resolveAction('move', point);
  } else if (mode !== 'hub') {
    const picked = view.pickAlly(state.allies, event.clientX, event.clientY);
    if (picked) selectUnit(state, picked);
    else state.selected.length = 0;
    ui.sync(state, false);
  }
});

function suspend() {
  if (active() && mode !== 'hub') showScreen('pause');
}
canvas.addEventListener('webglcontextlost', suspend);
canvas.addEventListener('webglcontextrestored', () => { if (view) view.lastRender = -Infinity; });
document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
window.addEventListener('pagehide', () => {
  if (mode === 'battle') writeProfile(storage, profile, state);
});

const STEP = 1 / 30;
let lastFrame = 0;
let lastHud = -Infinity;
function frame(now) {
  const delta = Math.min((now - (lastFrame || now)) / 1000, .25);
  lastFrame = now;
  if (active()) {
    simulationDebt += delta;
    const movement = input.read();
    while (simulationDebt >= STEP && !state.result) {
      const { x, z } = state.player;
      const revives = state.revives;
      if (mode === 'hub') updatePlayer(state.player, movement, STEP, missionSpec(state), state.traits);
      else stepMission(state, movement, STEP, mode === 'training');
      if (state.revives < revives) ui.notify('respawn');
      if (mode === 'training' && !lessonPassed) {
        if (lesson === 0) {
          lessonDistance += Math.hypot(state.player.x - x, state.player.z - z);
          if (lessonDistance >= .65) passLesson();
        }
        if (lesson === 4 && state.defeated > 0) passLesson();
      }
      simulationDebt -= STEP;
    }
    if (state.result) {
      mode = 'result';
      resultReward = state.result === 'victory' ? completeLevel(profile, state.levelId) : 0;
      resultSaved = writeProfile(storage, profile, null);
      audio.cue(resultReward || state.result === 'victory' ? 'victory' : 'defeat');
      showScreen('result');
      view.lastRender = -Infinity;
    } else if (mode === 'battle' && now - lastSave >= 5000) {
      writeProfile(storage, profile, state);
      lastSave = now;
    }
    if (now - lastHud >= 110) {
      ui.sync(state, aiming);
      if (mode === 'hub') {
        const npc = nearby();
        document.getElementById('field-status').textContent = npc ? t('interactNearby', { name: cast[npc.npc].name }) : '';
      }
      lastHud = now;
    }
  }
  audio.update(mode === 'battle' && active() ? 'battle' : mode === 'hub' ? 'hub' : 'home');
  view.draw(state, now, active());
  requestAnimationFrame(frame);
}

if (view) {
  view.setSettings(profile.settings);
  ui.sync(state, false);
  ui.home(profile);
  requestAnimationFrame(frame);
}
