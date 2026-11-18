import { Battlefield } from './render.js';
import { act, createMission, stepMission } from './mission.js';
import { Interface, lessons } from './ui.js';
import { bindInput } from './input.js';
import { readSave, writeSave } from './save.js';
import { commands } from './config.js';

const storage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value)
};
const save = readSave(storage);
let state = createMission();
let mode = 'home';
let resumeMode = 'battle';
let lesson = 0;
let lessonPassed = false;
let lessonDistance = 0;
let aiming = false;
let nextSave = 5;
let simulationDebt = 0;
const canvas = document.getElementById('arena');
const ui = new Interface(handleAction, setQuality, save.quality);
let view;

try {
  view = new Battlefield(canvas);
} catch (error) {
  console.error(error);
  ui.unsupported();
}

function active() {
  return mode === 'battle' || mode === 'training';
}

const input = bindInput(ui.root, active, handleAction);

function setQuality(quality) {
  save.quality = quality;
  view?.setQuality(quality);
  if (mode === 'paused' && resumeMode === 'battle') writeSave(storage, save, state);
  else writeSave(storage, save, save.mission);
}

function setAiming(value) {
  aiming = value;
  ui.aiming(value);
  ui.sync(state, aiming);
}

function enterBattle(checkpoint) {
  state = checkpoint ?? createMission();
  mode = 'battle';
  nextSave = state.elapsed + 5;
  view.reset();
  input.clear();
  simulationDebt = 0;
  ui.showLesson(-1);
  ui.hideMenu();
  setAiming(false);
  writeSave(storage, save, state);
  if (!checkpoint) ui.notify('missionStart');
}

function enterTraining() {
  state = createMission();
  mode = 'training';
  lesson = 0;
  lessonPassed = false;
  lessonDistance = 0;
  view.reset();
  input.clear();
  simulationDebt = 0;
  ui.clearNotice();
  ui.hideMenu();
  setAiming(false);
  ui.showLesson(lesson, lessonPassed);
}

function passLesson() {
  if (lessonPassed || mode !== 'training') return;
  lessonPassed = true;
  ui.showLesson(lesson, lessonPassed);
}

function pause() {
  if (!active()) return;
  resumeMode = mode;
  mode = 'paused';
  input.clear();
  setAiming(false);
  ui.clearNotice();
  ui.showLesson(-1);
  const training = resumeMode === 'training';
  ui.pause(!training && writeSave(storage, save, state), training);
}

function resolveAction(action, point) {
  const result = act(state, action, point);
  ui.notify(result.ok ? 'message_' + result.key : result.key, result);
  ui.sync(state, aiming);
  if (!result.ok || mode !== 'training') return;
  if ((lesson === 1 && action === 'summon') ||
      (lesson === 2 && commands.includes(action)) ||
      (lesson === 3 && action === 'pulse')) passLesson();
}

function handleAction(action) {
  if (!view) return;
  if (action === 'start' || action === 'restart') enterBattle();
  if (action === 'resumeSaved' && save.mission) enterBattle(save.mission);
  if (action === 'training') enterTraining();
  if (action === 'resume' && mode === 'paused') {
    mode = resumeMode;
    ui.hideMenu();
    if (mode === 'training') ui.showLesson(lesson, lessonPassed);
    return;
  }
  if (!active()) return;
  if (action === 'skip' && mode === 'training') {
    enterBattle();
  } else if (action === 'next' && mode === 'training' && lessonPassed) {
    lesson += 1;
    if (lesson === lessons.length) enterBattle();
    else {
      lessonPassed = false;
      ui.showLesson(lesson, lessonPassed);
    }
  } else if (action === 'zoomIn' || action === 'zoomOut') {
    view.view.adjust(action === 'zoomIn' ? 1.18 : 1 / 1.18);
  } else if (action === 'pause' || (action === 'escape' && !aiming)) {
    pause();
  } else if (action === 'escape' || action === 'move') {
    setAiming(action === 'move' && !aiming);
    ui.notify(aiming ? 'chooseMove' : 'moveCanceled', {}, aiming);
  } else if (commands.includes(action) || ['pulse', 'summon', 'upgrade'].includes(action)) {
    setAiming(false);
    resolveAction(action);
  }
}

canvas.addEventListener('pointerup', event => {
  if (!active() || !aiming || event.button !== 0) return;
  const point = view.projectToGround(event.clientX, event.clientY);
  if (point) {
    setAiming(false);
    resolveAction('move', point);
  }
});

canvas.addEventListener('webglcontextlost', () => pause());
canvas.addEventListener('webglcontextrestored', () => {
  if (view) view.lastRender = -Infinity;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('pagehide', () => {
  if (mode === 'battle') writeSave(storage, save, state);
});

const STEP = 1 / 30;
let lastFrame = 0;
let lastHud = -Infinity;
function frame(now) {
  const delta = Math.min((now - (lastFrame || now)) / 1000, 0.25);
  lastFrame = now;
  if (active()) {
    simulationDebt += delta;
    const movement = input.read();
    while (simulationDebt >= STEP && !state.result) {
      const { x, z } = state.player;
      stepMission(state, movement, STEP, mode === 'training');
      if (mode === 'training' && lesson === 0 && !lessonPassed) {
        lessonDistance += Math.hypot(state.player.x - x, state.player.z - z);
        if (lessonDistance >= 0.85) passLesson();
      }
      simulationDebt -= STEP;
    }
    if (state.result) {
      mode = 'result';
      save.unlocked ||= state.result === 'victory';
      const saved = writeSave(storage, save, null);
      input.clear();
      setAiming(false);
      ui.clearNotice();
      ui.showLesson(-1);
      ui.sync(state, false);
      ui.result(state, saved);
      view.lastRender = -Infinity;
    } else if (mode === 'battle' && state.elapsed >= nextSave) {
      writeSave(storage, save, state);
      nextSave = state.elapsed + 5;
    }
    if (now - lastHud >= 110) {
      ui.sync(state, aiming);
      lastHud = now;
    }
  }
  view.draw(state, now, active());
  requestAnimationFrame(frame);
}

if (view) {
  view.setQuality(save.quality);
  ui.sync(state, false);
  ui.home(save);
  requestAnimationFrame(frame);
}
