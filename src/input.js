const movement = {
  KeyW: 'up', ArrowUp: 'up',
  KeyA: 'left', ArrowLeft: 'left',
  KeyS: 'down', ArrowDown: 'down',
  KeyD: 'right', ArrowRight: 'right'
};
const shortcuts = {
  Digit1: 'summon', Digit2: 'attack', Digit3: 'defend', Digit4: 'follow', Digit5: 'move',
  Space: 'pulse', KeyF: 'strike', KeyE: 'interact', KeyM: 'map', KeyU: 'upgrade', Escape: 'escape', Minus: 'zoomOut', Equal: 'zoomIn'
};

export function bindInput(root, active, onAction) {
  const keys = new Set();
  const pointers = new Map();
  const stick = root.querySelector('#stick');
  const knob = stick.firstElementChild;
  let stickId = null;
  let stickX = 0;
  let stickZ = 0;
  let run = false;
  const pad = [...root.querySelectorAll('[data-direction]')];

  // iPad Safari can start a callout even when a pointer is captured.
  root.addEventListener('contextmenu', event => {
    if (event.target.closest('button')) event.preventDefault();
  });
  root.addEventListener('selectstart', event => {
    if (event.target.closest('button')) event.preventDefault();
  });

  function showDirections() {
    for (const button of pad) {
      const direction = button.dataset.direction;
      button.classList.toggle('pressed', [...pointers.values()].includes(direction));
    }
  }

  function releaseStick() {
    const id = stickId;
    stickId = null;
    stickX = 0;
    stickZ = 0;
    knob.style.transform = '';
    if (id !== null && stick.hasPointerCapture(id)) stick.releasePointerCapture(id);
  }

  function moveStick(event) {
    const bounds = stick.getBoundingClientRect();
    const dx = event.clientX - bounds.left - bounds.width / 2;
    const dz = event.clientY - bounds.top - bounds.height / 2;
    const radius = bounds.width * .32;
    const distance = Math.hypot(dx, dz);
    const divisor = Math.max(radius, distance);
    stickX = distance > 5 ? dx / divisor : 0;
    stickZ = distance > 5 ? dz / divisor : 0;
    knob.style.transform = 'translate(' + stickX * radius + 'px,' + stickZ * radius + 'px)';
  }

  stick.addEventListener('pointerdown', event => {
    if (!active() || event.button !== 0 || stickId !== null) return;
    event.preventDefault();
    stickId = event.pointerId;
    stick.setPointerCapture(stickId);
    moveStick(event);
  });
  stick.addEventListener('pointermove', event => {
    if (event.pointerId === stickId) moveStick(event);
  });
  stick.addEventListener('lostpointercapture', event => {
    if (event.pointerId === stickId) releaseStick();
  });

  function clear() {
    keys.clear();
    pointers.clear();
    releaseStick();
    showDirections();
  }

  for (const button of pad) {
    button.addEventListener('pointerdown', event => {
      if (!active() || event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.direction);
      showDirections();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(name, event => {
        pointers.delete(event.pointerId);
        showDirections();
      });
    }
  }

  window.addEventListener('keydown', event => {
    if (!active() || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') keys.add(event.code);
    if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
    const direction = movement[event.code];
    const action = shortcuts[event.code];
    if (!direction && !action) return;
    event.preventDefault();
    if (direction) keys.add(event.code);
    if (action && !event.repeat) onAction(action);
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', clear);
  for (const name of ['pointerup', 'pointercancel']) {
    window.addEventListener(name, event => {
      if (event.pointerId === stickId) releaseStick();
      if (pointers.delete(event.pointerId)) showDirections();
    }, true);
  }
  window.addEventListener('pagehide', clear);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear();
  });

  const axis = { x: 0, z: 0 };
  function read() {
    let up = false;
    let down = false;
    let left = false;
    let right = false;
    for (const key of keys) {
      up ||= movement[key] === 'up';
      down ||= movement[key] === 'down';
      left ||= movement[key] === 'left';
      right ||= movement[key] === 'right';
    }
    for (const direction of pointers.values()) {
      up ||= direction === 'up';
      down ||= direction === 'down';
      left ||= direction === 'left';
      right ||= direction === 'right';
    }
    axis.x = Number(right) - Number(left) || stickX;
    axis.z = Number(down) - Number(up) || stickZ;
    axis.run = run || keys.has('ShiftLeft') || keys.has('ShiftRight');
    return axis;
  }
  return { clear, read, toggleRun: () => (run = !run) };
}
