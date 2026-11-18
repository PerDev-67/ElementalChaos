import { commands, hydrogen, level } from './config.js';
import { phaseAt } from './mission.js';
import { t } from './locale.js';

export const lessons = ['lessonMove', 'lessonSummon', 'lessonOrders', 'lessonPulse'];
const byId = id => document.getElementById(id);

function text(id, value) {
  const element = byId(id);
  if (element.textContent !== String(value)) element.textContent = value;
}

function meter(id, amount, max) {
  const progress = byId(id);
  const value = Math.ceil(amount);
  progress.max = max;
  if (progress.value !== value) progress.value = value;
  text(id + '-value', value + ' / ' + max);
}

function timeLabel(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

export class Interface {
  menu = byId('menu');
  notice = byId('notice');
  tutorial = byId('tutorial');
  actions = byId('menu-actions');
  root = byId('game');
  quality = byId('quality');
  lastNoticeTimer = 0;

  constructor(onAction, onQuality, initialQuality) {
    document.title = t('pageTitle');
    for (const element of document.querySelectorAll('[data-text]')) element.textContent = t(element.dataset.text);
    this.root.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      onAction(button.dataset.action);
      if (event.detail > 0 && !this.menu.open && document.activeElement === button) button.blur();
    });
    this.menu.addEventListener('cancel', event => {
      event.preventDefault();
      onAction('resume');
    });
    this.quality.value = initialQuality;
    this.quality.addEventListener('change', () => onQuality(this.quality.value));
    this.orderButtons = new Map(commands.map(command => [command, this.root.querySelector(`[data-action="${command}"]`)]));
  }

  notify(key, values, persistent = false) {
    clearTimeout(this.lastNoticeTimer);
    this.notice.textContent = t(key, values);
    this.notice.hidden = false;
    if (!persistent) this.lastNoticeTimer = setTimeout(() => this.clearNotice(), 2300);
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
    meter('core', state.core.hp, state.core.maxHp);
    meter('health', state.player.hp, state.player.maxHp);
    meter('energy', Math.floor(state.energy), level.maxEnergy);
    const remaining = level.duration - state.elapsed;
    text('timer', timeLabel(remaining));
    byId('clock').max = level.duration;
    byId('clock').value = remaining;
    const phase = phaseAt(state.elapsed);
    text('phase', t('phase', { wave: phase + 1, total: level.phases.length }));
    text('wave-name', t('phaseNames')[phase]);
    text('squad', state.allies.length + ' / ' + hydrogen.cap + '  ·  ' + t('eliminated', { count: state.defeated }));
    text('rank', t('rank', { rank: state.rank + 1 }));
    text('summon-cost', t('cost', { cost: hydrogen.cost }));
    text('pulse-cost', state.player.cooldown > 0 ? t('cooldown', { time: Math.ceil(state.player.cooldown) }) : t('cost', level.pulse));
    const upgrade = hydrogen.ranks[state.rank + 1];
    text('upgrade-cost', upgrade ? t('cost', upgrade) : t('maxRank'));
    for (const [command, button] of this.orderButtons) {
      button.setAttribute('aria-pressed', String(aiming ? command === 'move' : state.order === command));
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

  showMenu(title, description, label, detail, buttons) {
    text('menu-title', title);
    text('menu-description', description);
    text('menu-label', label);
    text('menu-detail', detail);
    byId('menu-detail').hidden = !detail;
    this.actions.replaceChildren();
    for (const [action, key] of buttons) {
      const button = document.createElement('button');
      button.dataset.action = action;
      button.textContent = t(key);
      if (!this.actions.childElementCount) button.className = 'accent';
      this.actions.append(button);
    }
    if (!this.menu.open) this.menu.showModal();
    this.actions.firstElementChild?.focus();
  }

  home(save) {
    const buttons = save.mission
      ? [['resumeSaved', 'resumeSaved'], ['start', 'start'], ['training', 'startTutorial']]
      : [['training', 'startTutorial'], ['start', 'start']];
    this.showMenu(t('title'), t('homeDescription'), t('levelLabel'), t(save.unlocked ? 'unlocked' : 'locked'), buttons);
  }

  pause(saved, training) {
    const description = training ? 'trainingPaused' : saved ? 'saved' : 'saveUnavailable';
    this.showMenu(t('paused'), t(description), t('title'), '', [['resume', 'resume'], ['restart', 'restart']]);
  }

  result(state, saved) {
    const detail = t('resultStats', { defeated: state.defeated, rank: state.rank + 1, time: timeLabel(state.elapsed) });
    const description = state.result === 'victory' && !saved ? t('victorySession') : t(state.result + 'Description');
    this.showMenu(t(state.result), description, t('battleReport'), detail, [['restart', 'restart']]);
  }

  unsupported() {
    this.showMenu(t('title'), t('webglError'), t('brand'), '', []);
    this.quality.disabled = true;
  }
}
