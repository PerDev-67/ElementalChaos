import { campaign, commands, hydrogen, missionSpec } from './config.js';
import { phaseAt } from './mission.js';
import { setLocale, t } from './locale.js';
import { elements, unitSpec } from './elements.js';
import { availableLevel, cast, upgrades, aftermath } from './campaign.js';
import { qualities } from './profile.js';

export const lessons = ['lessonMove', 'lessonCamera', 'lessonTalk', 'lessonSummon', 'lessonAuto', 'lessonOrders', 'lessonCore', 'lessonFinish'];
const byId = id => document.getElementById(id);
const names = { ...cast, ren: { name: 'Ren', role: 'Field explorer' } };
const portraits = ['ren', 'mira', 'tess', 'orin', 'lumi'];

function create(tag, copy, className) {
  const node = document.createElement(tag);
  if (copy) node.textContent = copy;
  if (className) node.className = className;
  return node;
}

function text(id, value) {
  const element = byId(id);
  if (element.textContent !== String(value)) element.textContent = value;
}

function meter(id, amount, max) {
  const progress = byId(id);
  const value = Math.ceil(amount);
  if (progress.max !== max) progress.max = max;
  if (progress.value !== value) progress.value = value;
  text(id + '-value', value + ' / ' + max);
}

function timeLabel(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

function row(name, detail, action, label, locked = false) {
  const node = create('div', '', 'menu-row');
  const caption = create('div');
  caption.append(create('strong', name), create('small', detail));
  node.append(caption);
  if (action) {
    const button = create('button', label);
    button.dataset.action = action;
    button.disabled = locked;
    node.append(button);
  }
  return node;
}

function field(name, control) {
  const label = create('label', '', 'setting');
  label.append(create('span', t(name)), control);
  control.dataset.setting = name;
  return label;
}

export class Interface {
  menu = byId('menu');
  notice = byId('notice');
  tutorial = byId('tutorial');
  actions = byId('menu-actions');
  root = byId('game');
  content = byId('menu-content');
  element = byId('element');
  lastNoticeTimer = 0;

  constructor(onAction, onChoice, settings) {
    this.localize(settings);
    this.root.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      onAction(button.dataset.action);
      if (event.detail > 0 && !this.menu.open && document.activeElement === button) button.blur();
    });
    this.menu.addEventListener('cancel', event => {
      event.preventDefault();
      onAction('back');
    });
    this.content.addEventListener('change', event => {
      const field = event.target;
      if (field.dataset.setting) {
        const value = field.type === 'checkbox' ? field.checked : field.type === 'range' ? Number(field.value) : field.value;
        onChoice(field.dataset.setting, value);
      }
    });
    this.element.addEventListener('change', () => {
      onChoice('element', Number(this.element.value));
      this.element.blur();
    });
    this.orderButtons = new Map(commands.map(command => [command, this.root.querySelector(`[data-action="${command}"]`)]));
  }

  localize(settings) {
    setLocale(settings.locale);
    document.documentElement.lang = settings.locale;
    document.title = t('pageTitle');
    for (const element of document.querySelectorAll('[data-text]')) element.textContent = t(element.dataset.text);
    this.root.dataset.control = settings.movement === 'stick' && (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) ? 'stick' : 'pad';
  }

  notify(key, values, persistent = false) {
    clearTimeout(this.lastNoticeTimer);
    this.notice.textContent = t(key, values);
    this.notice.hidden = false;
    if (!persistent) this.lastNoticeTimer = setTimeout(() => this.clearNotice(), 2550);
  }

  clearNotice() {
    clearTimeout(this.lastNoticeTimer);
    this.notice.hidden = true;
  }

  aiming(value) {
    this.root.classList.toggle('aiming', value);
  }

  hideMenu() {
    if (this.menu.open) this.menu.close();
    if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
  }

  sync(state, aiming) {
    const map = missionSpec(state);
    const hub = state.levelId === 0;
    this.root.dataset.hub = String(hub);
    if (hub) {
      text('location', map.title);
      text('phase', t('opening'));
      text('objective', t('explore'));
      text('wave-name', t('mapIntro'));
      text('field-status', '');
      return;
    }
    text('location', map.title);
    meter('core', state.core.hp, state.core.maxHp);
    meter('health', state.player.hp, state.player.maxHp);
    meter('energy', Math.floor(state.energy), map.maxEnergy);
    const remaining = map.duration - state.elapsed;
    text('timer', timeLabel(remaining));
    byId('clock').max = map.duration;
    byId('clock').value = remaining;
    const phase = phaseAt(state.elapsed, map);
    text('phase', t('phase', { wave: phase + 1, total: map.phases.length }));
    const captureNeeded = map.capture && state.captureHold < map.capture.time;
    const boss = state.enemies.find(unit => unit.type === 'guardian');
    const objective = boss ? 'finalBoss' : captureNeeded ? 'capture' : remaining <= 0 ? 'cleanUp' : 'objective';
    text('objective', t(objective));
    text('wave-name', boss ? t('bossHp', { hp: boss.hp }) : captureNeeded ?
      t('captureProgress', { percent: Math.floor(100 * state.captureHold / map.capture.time) }) :
      remaining <= 0 ? t('leftEnemies', { count: state.enemies.length }) : t('phaseNames')[phase]);
    const unit = state.allies.find(a => state.selected?.includes(a.id)) ?? state.allies.find(a => a.element === state.element);
    text('field-status', unit ? unitSpec(unit).symbol + ' · ' + t('field', { state: t(unit.phase), temp: unit.temperature }) : '');
    text('squad', t('selected', { selected: state.selected?.length || state.allies.length, count: state.allies.length, cap: map.unitCap }));
    text('rank', t('rank', { rank: state.rank + 1 }));
    if (this.element.options.length !== state.roster) {
      this.element.replaceChildren(...elements.slice(0, state.roster).map(item => new Option(item.symbol, item.atomicNumber)));
    }
    this.element.value = String(state.element);
    text('summon-cost', t('cost', elements[state.element - 1]));
    text('pulse-cost', state.player.cooldown > 0 ? t('cooldown', { time: Math.ceil(state.player.cooldown) }) : t('cost', map.pulse));
    const upgrade = hydrogen.ranks[state.rank + 1];
    text('upgrade-cost', upgrade ? t('cost', upgrade) : t('maxRank'));
    for (const [command, button] of this.orderButtons) {
      const selectedOrder = unit && state.selected?.length ? unit.order ?? state.order : state.order;
      button.setAttribute('aria-pressed', String(aiming ? command === 'move' : selectedOrder === command));
    }
  }

  showLesson(index, passed) {
    this.tutorial.hidden = index < 0;
    if (index < 0) return;
    text('lesson-count', t('tutorialLabel', { step: index + 1 }));
    text('lesson', t(lessons[index]));
    text('lesson-help', t(lessons[index] + 'Help'));
    text('lesson-next', t(index === lessons.length - 1 ? 'begin' : 'next'));
    byId('lesson-next').disabled = !passed;
  }

  showMenu(title, description, label, detail, buttons, content) {
    text('menu-title', title);
    text('menu-description', description);
    text('menu-label', label);
    text('menu-detail', detail);
    byId('menu-detail').hidden = !detail;
    byId('menu-description').hidden = !description;
    this.actions.replaceChildren();
    this.content.replaceChildren();
    if (content) this.content.append(content);
    for (const [action, key] of buttons) {
      const button = create('button', t(key));
      button.dataset.action = action;
      if (!this.actions.childElementCount) button.className = 'accent';
      this.actions.append(button);
    }
    if (!this.menu.open) this.menu.showModal();
    this.actions.firstElementChild?.focus();
  }

  home(profile) {
    const buttons = profile.started ? [['continue', 'continueGame'], ['new', 'newGame']] : [['new', 'newGame']];
    buttons.push(['training', 'tutorial'], ['skipHome', 'skipTutorial'], ['settings', 'settings']);
    const art = create('div', '', 'title-art');
    const portrait = create('img');
    portrait.src = './art/ren.webp';
    portrait.alt = '';
    art.append(portrait);
    this.showMenu(t('rpgTitle'), t('rpgIntro'), t('opening'), t('currencies', { coins: profile.coins, clears: profile.completed.length }), buttons, art);
  }

  resetPrompt() {
    this.showMenu(t('resetTitle'), t('resetHelp'), t('opening'), '', [['confirmNew', 'resetConfirm'], ['back', 'back']]);
  }

  pause(saved, training) {
    const description = training ? 'trainingPaused' : saved ? 'saved' : 'saveUnavailable';
    this.showMenu(t('paused'), t(description), t('opening'), '', [
      ['resume', 'resume'], ['restart', 'restart'], ['hub', 'hub'], ['settings', 'settings'], ['titleScreen', 'titleScreen']
    ]);
  }

  map(profile) {
    const nodes = create('div', '', 'menu-rows map');
    for (const level of campaign) {
      const unlocked = availableLevel(profile, level.id);
      const chapter = t('levelCallout', { chapter: level.chapter, level: level.id });
      const status = profile.completed.includes(level.id) ? t('clear') : unlocked ? t('available') : t('locked');
      const destination = row(level.title, chapter + ' · ' + status, 'travel:' + level.id, t(unlocked ? 'travel' : 'locked'), !unlocked);
      destination.style.setProperty('--region', level.color);
      nodes.append(destination);
    }
    const buttons = [['hub', 'hub'], ['shop', 'shop'], ['collection', 'collection'], ['settings', 'settings'], ['titleScreen', 'titleScreen'], ['back', 'back']];
    if (profile.mission) buttons.unshift(['resumeSaved', 'resumeSaved']);
    this.showMenu(t('map'), t('mapIntro'), t('opening'), t('currencies', { coins: profile.coins, clears: profile.completed.length }), buttons, nodes);
  }

  collection(profile) {
    const nodes = create('div', '', 'menu-rows');
    for (const element of elements) {
      const unlocked = profile.completed.includes(element.atomicNumber);
      const title = unlocked ? `${element.atomicNumber}  ${element.symbol} · ${element.name}` : `${element.atomicNumber}  ·  ${t('locked')}`;
      const detail = unlocked ? `${element.character}, age ${element.age} · ${element.ability}` : t('unknownElement', { id: element.atomicNumber });
      const item = row(title, detail);
      if (unlocked) {
        const portrait = create('img', '', 'collection-icon');
        portrait.src = './art/' + element.character.toLowerCase() + '.webp';
        portrait.alt = '';
        item.prepend(portrait);
        item.classList.add('collection-row');
      }
      nodes.append(item);
    }
    this.showMenu(t('collection'), t('collectionIntro'), t('opening'), '', [['map', 'map'], ['back', 'back']], nodes);
  }

  shop(profile) {
    const nodes = create('div', '', 'menu-rows');
    for (const upgrade of upgrades) {
      const owned = profile.traits.includes(upgrade.id);
      nodes.append(row(upgrade.name, upgrade.detail, 'buy:' + upgrade.id,
        owned ? t('owned') : t('price', upgrade), owned || profile.coins < upgrade.cost));
    }
    this.showMenu(t('shop'), t('shopIntro'), t('opening'), t('currencies', { coins: profile.coins, clears: profile.completed.length }), [['map', 'map'], ['back', 'back']], nodes);
  }

  settings(settings) {
    const nodes = create('div');
    for (const [name, values] of [
      ['quality', qualities], ['movement', ['stick', 'pad']], ['display', ['simple', 'adventurers']], ['locale', ['en', 'zh-Hant', 'ja']]
    ]) {
      const select = create('select');
      const labels = { en: 'English', 'zh-Hant': '繁體中文', ja: '日本語' };
      for (const option of values) select.append(new Option(labels[option] ?? t(option), option));
      select.value = settings[name];
      nodes.append(field(name, select));
    }
    const limit = create('input');
    limit.type = 'checkbox';
    limit.checked = settings.limit;
    nodes.append(field('limit', limit));
    for (const name of ['music', 'effects']) {
      const control = create('input');
      control.type = 'range';
      control.min = 0;
      control.max = 1;
      control.step = 0.05;
      control.value = settings[name];
      nodes.append(field(name, control));
    }
    this.showMenu(t('settings'), '', t('opening'), '', [['back', 'back']], nodes);
  }

  dialogue(line, last, finalAction, finalKey, label) {
    const [who, message] = line;
    const person = names[who];
    const content = create('div', '', 'dialogue');
    if (portraits.includes(who)) {
      const portrait = create('img');
      portrait.src = `./art/${who}.webp`;
      portrait.alt = '';
      content.append(portrait);
    } else {
      content.append(create('span', person.name.slice(0, 1), 'speaker-initial'));
    }
    content.append(create('blockquote', message));
    const buttons = [[last ? finalAction : 'line', last ? finalKey : 'next']];
    if (!last && finalAction === 'depart') buttons.push(['depart', 'skipBriefing']);
    buttons.push(['back', 'back']);
    this.showMenu(person.name, person.role, label, '', buttons, content);
  }

  result(state, reward, saved) {
    const map = missionSpec(state);
    if (state.result === 'victory') {
      const isEnd = state.levelId === campaign.length;
      const detail = saved ? t(reward ? 'earned' : 'replayClear', { coins: reward }) : t('saveUnavailable');
      const title = isEnd ? t('complete') : map.title + ' cleared';
      const description = aftermath[state.levelId - 1];
      const strip = create('div', '', 'complete-cast');
      for (const element of isEnd ? elements : [elements[state.levelId - 1]]) {
        const tile = create('figure');
        const portrait = create('img');
        portrait.src = './art/' + element.character.toLowerCase() + '.webp';
        portrait.alt = '';
        tile.append(portrait, create('figcaption', element.name));
        strip.append(tile);
      }
      this.showMenu(title, description, isEnd ? t('finalClear') : t('battleReport'), detail,
        [['hub', 'hub'], ['map', 'map'], ['collection', 'collection']], strip);
    } else {
      const detail = t('resultStats', { defeated: state.defeated, rank: state.rank + 1, time: timeLabel(state.elapsed) });
      this.showMenu(t(state.result), t(state.result + 'Description'), t('battleReport'), detail, [['restart', 'restart'], ['hub', 'hub']]);
    }
  }

  unsupported() {
    this.showMenu(t('rpgTitle'), t('webglError'), t('opening'), '', []);
  }
}
