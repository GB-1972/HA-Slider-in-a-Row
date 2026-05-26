const CSR_VERSION = '1.0.0';

console.info(
  `%c COVER-SLIDER-ROW-CARD %c v${CSR_VERSION} `,
  'color: white; background: #f59e0b; font-weight: 700; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'color: #f59e0b; background: #1f2937; font-weight: 700; padding: 2px 6px; border-radius: 0 4px 4px 0;'
);

class CoverSliderRowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._items = [];
    this._panelEls = {};
    this._localPositions = {};
    this._dragging = {};
    this._releaseTimers = {};
  }

  static getStubConfig() {
    return {
      title: 'Solarpanels',
      icon: 'mdi:solar-panel',
      entities: [
        'cover.solarpanel_1',
        'cover.solarpanel_2',
        'cover.solarpanel_3',
        'cover.solarpanel_4',
        'cover.solarpanel_5',
        'cover.solarpanel_6',
        'cover.solarpanel_7',
        'cover.solarpanel_8',
      ],
    };
  }

  setConfig(config) {
    if (!config || !Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error('Mindestens eine cover-Entitaet unter "entities" angeben.');
    }
    const items = config.entities.map((e, i) => {
      const obj = typeof e === 'string' ? { entity: e } : { ...e };
      if (!obj.entity || typeof obj.entity !== 'string' || !obj.entity.startsWith('cover.')) {
        throw new Error(`Eintrag ${i + 1} ist keine gueltige cover-Entitaet: ${JSON.stringify(e)}`);
      }
      return obj;
    });
    this._config = {
      title: config.title ?? '',
      icon: config.icon ?? 'mdi:solar-panel',
      accent_color: config.accent_color ?? '#f59e0b',
      track_color: config.track_color ?? 'rgba(127,127,127,0.18)',
      show_buttons: config.show_buttons !== false,
      show_percentage: config.show_percentage !== false,
      show_name: config.show_name !== false,
      show_stop: config.show_stop !== false,
      invert: config.invert === true,
      height: typeof config.height === 'number' ? config.height : 220,
      min_panel_width: typeof config.min_panel_width === 'number' ? config.min_panel_width : 56,
    };
    this._items = items;
    this._build();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._build();
    else this._refresh();
  }

  getCardSize() {
    return Math.max(3, Math.round(this._config?.height / 60) || 4);
  }

  _build() {
    if (!this.shadowRoot || !this._config) return;
    this.shadowRoot.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = this._css();
    this.shadowRoot.appendChild(style);

    const card = document.createElement('ha-card');
    card.className = 'cs-card';

    if (this._config.title) {
      const header = document.createElement('div');
      header.className = 'cs-header';
      const ic = document.createElement('ha-icon');
      ic.setAttribute('icon', this._config.icon);
      const lbl = document.createElement('span');
      lbl.textContent = this._config.title;
      header.appendChild(ic);
      header.appendChild(lbl);
      card.appendChild(header);
    }

    const row = document.createElement('div');
    row.className = 'cs-row';
    row.style.setProperty('--cs-panel-height', `${this._config.height}px`);
    row.style.setProperty('--cs-min-panel-width', `${this._config.min_panel_width}px`);

    this._panelEls = {};
    for (const item of this._items) {
      const panel = this._buildPanel(item);
      row.appendChild(panel.root);
      this._panelEls[item.entity] = panel;
    }

    card.appendChild(row);
    this.shadowRoot.appendChild(card);
    this._refresh();
  }

  _buildPanel(item) {
    const root = document.createElement('div');
    root.className = 'cs-panel';
    root.dataset.entity = item.entity;

    const name = document.createElement('div');
    name.className = 'cs-name';
    root.appendChild(name);

    const up = this._mkBtn('cs-up', 'mdi:chevron-up', 'Auf', () =>
      this._call('open_cover', item.entity)
    );
    if (this._config.show_buttons) root.appendChild(up);

    const slider = document.createElement('div');
    slider.className = 'cs-slider';
    const track = document.createElement('div');
    track.className = 'cs-track';
    const fill = document.createElement('div');
    fill.className = 'cs-fill';
    const thumb = document.createElement('div');
    thumb.className = 'cs-thumb';
    track.appendChild(fill);
    track.appendChild(thumb);
    slider.appendChild(track);
    this._attachSliderEvents(slider, track, item.entity, root);
    root.appendChild(slider);

    const down = this._mkBtn('cs-down', 'mdi:chevron-down', 'Ab', () =>
      this._call('close_cover', item.entity)
    );
    if (this._config.show_buttons) root.appendChild(down);

    const stop = this._mkBtn('cs-btn-stop', 'mdi:stop', 'Stop', () =>
      this._call('stop_cover', item.entity)
    );
    if (this._config.show_buttons && this._config.show_stop) root.appendChild(stop);

    const pct = document.createElement('div');
    pct.className = 'cs-pct';
    root.appendChild(pct);

    root.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._fireMoreInfo(item.entity);
    });

    return { root, name, fill, thumb, pct, up, down, stop };
  }

  _mkBtn(cls, icon, title, onClick) {
    const b = document.createElement('button');
    b.className = `cs-btn ${cls}`;
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    const i = document.createElement('ha-icon');
    i.setAttribute('icon', icon);
    b.appendChild(i);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  _attachSliderEvents(slider, track, entityId, panelRoot) {
    let pendingPos = null;

    const calcPos = (clientY) => {
      const rect = track.getBoundingClientRect();
      const offset = clientY - rect.top;
      const ratio = 1 - Math.min(1, Math.max(0, offset / rect.height));
      let pos = Math.round(ratio * 100);
      if (this._config.invert) pos = 100 - pos;
      return pos;
    };

    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      this._dragging[entityId] = true;
      panelRoot.classList.add('cs-dragging');
      try { slider.setPointerCapture(e.pointerId); } catch {}
      pendingPos = calcPos(e.clientY);
      this._localPositions[entityId] = pendingPos;
      this._renderPanel(entityId);
    };

    const onMove = (e) => {
      if (!this._dragging[entityId]) return;
      pendingPos = calcPos(e.clientY);
      this._localPositions[entityId] = pendingPos;
      this._renderPanel(entityId);
    };

    const onUp = (e) => {
      if (!this._dragging[entityId]) return;
      this._dragging[entityId] = false;
      panelRoot.classList.remove('cs-dragging');
      try { slider.releasePointerCapture(e.pointerId); } catch {}
      if (pendingPos !== null) {
        this._call('set_cover_position', entityId, { position: pendingPos });
        pendingPos = null;
      }
      clearTimeout(this._releaseTimers[entityId]);
      this._releaseTimers[entityId] = setTimeout(() => {
        delete this._localPositions[entityId];
        this._renderPanel(entityId);
      }, 1200);
    };

    slider.addEventListener('pointerdown', onDown);
    slider.addEventListener('pointermove', onMove);
    slider.addEventListener('pointerup', onUp);
    slider.addEventListener('pointercancel', onUp);
  }

  _call(service, entity_id, extra = {}) {
    if (!this._hass) return;
    this._hass.callService('cover', service, { entity_id, ...extra });
  }

  _fireMoreInfo(entity_id) {
    const ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId: entity_id };
    this.dispatchEvent(ev);
  }

  _refresh() {
    if (!this._panelEls || !this._items) return;
    for (const item of this._items) this._renderPanel(item.entity);
  }

  _renderPanel(entityId) {
    const els = this._panelEls[entityId];
    if (!els) return;
    const stateObj = this._hass?.states?.[entityId];

    let position;
    if (this._localPositions[entityId] !== undefined) {
      position = this._localPositions[entityId];
    } else if (stateObj?.attributes?.current_position !== undefined && stateObj.attributes.current_position !== null) {
      position = stateObj.attributes.current_position;
    } else if (stateObj?.state === 'open') {
      position = 100;
    } else if (stateObj?.state === 'closed') {
      position = 0;
    } else {
      position = 0;
    }
    position = Math.max(0, Math.min(100, Math.round(position)));

    const ratio = this._config.invert ? (100 - position) / 100 : position / 100;
    const heightPct = ratio * 100;

    els.fill.style.height = `${heightPct}%`;
    els.thumb.style.bottom = `calc(${heightPct}% - 9px)`;

    const item = this._items.find((i) => i.entity === entityId);
    const nameText =
      item?.name ??
      stateObj?.attributes?.friendly_name ??
      entityId.split('.').pop().replace(/_/g, ' ');

    if (this._config.show_name) {
      els.name.textContent = nameText;
      els.name.style.display = '';
      els.name.title = nameText;
    } else {
      els.name.style.display = 'none';
    }

    if (this._config.show_percentage) {
      els.pct.textContent = `${position}%`;
      els.pct.style.display = '';
    } else {
      els.pct.style.display = 'none';
    }

    const unavailable = !stateObj || stateObj.state === 'unavailable' || stateObj.state === 'unknown';
    els.root.classList.toggle('cs-unavailable', unavailable);

    const moving = stateObj?.state === 'opening' || stateObj?.state === 'closing';
    els.root.classList.toggle('cs-moving', moving);
  }

  _css() {
    return `
      :host {
        --cs-accent: ${this._config.accent_color};
        --cs-track-bg: ${this._config.track_color};
        --cs-radius: 14px;
      }
      .cs-card { padding: 14px 12px 12px; }
      .cs-header {
        display: flex; align-items: center; gap: 8px;
        font-size: 1.05rem; font-weight: 600;
        color: var(--primary-text-color);
        padding: 2px 6px 12px;
      }
      .cs-header ha-icon { color: var(--cs-accent); --mdc-icon-size: 22px; }
      .cs-row {
        display: flex; flex-direction: row; gap: 8px;
        align-items: stretch;
        overflow-x: auto; overflow-y: hidden;
        padding: 4px 2px 6px;
        scrollbar-width: thin;
      }
      .cs-panel {
        flex: 1 1 0;
        min-width: var(--cs-min-panel-width, 56px);
        display: flex; flex-direction: column; align-items: center;
        gap: 6px;
        padding: 10px 6px;
        background: var(--ha-card-background, var(--card-background-color));
        border-radius: var(--cs-radius);
        box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        border: 1px solid rgba(127,127,127,0.14);
        transition: background-color 120ms ease, border-color 120ms ease;
      }
      .cs-panel.cs-moving {
        border-color: var(--cs-accent);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--cs-accent) 25%, transparent);
      }
      .cs-name {
        font-size: 0.74rem; font-weight: 600;
        color: var(--secondary-text-color);
        text-align: center;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 100%;
      }
      .cs-btn {
        appearance: none; border: none;
        background: rgba(127,127,127,0.12);
        color: var(--primary-text-color);
        border-radius: 10px;
        width: 38px; height: 28px;
        display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; padding: 0;
        transition: background-color 120ms ease, transform 80ms ease, color 120ms ease;
      }
      .cs-btn:hover { background: rgba(127,127,127,0.22); color: var(--cs-accent); }
      .cs-btn:active { transform: scale(0.92); }
      .cs-btn ha-icon { --mdc-icon-size: 20px; }
      .cs-btn-stop { background: rgba(239, 68, 68, 0.12); }
      .cs-btn-stop:hover { background: rgba(239, 68, 68, 0.22); color: #ef4444; }
      .cs-slider {
        flex: 1 1 auto;
        height: var(--cs-panel-height, 220px);
        width: 36px;
        display: flex; justify-content: center; align-items: stretch;
        touch-action: none;
        padding: 6px 0;
      }
      .cs-track {
        position: relative;
        width: 14px; height: 100%;
        border-radius: 8px;
        background: var(--cs-track-bg);
        overflow: visible;
        cursor: pointer;
      }
      .cs-fill {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        background: var(--cs-accent);
        opacity: 0.85;
        border-radius: 8px;
        transition: height 180ms ease;
        pointer-events: none;
      }
      .cs-thumb {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        width: 24px; height: 18px;
        background: var(--cs-accent);
        border-radius: 7px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.28);
        transition: bottom 180ms ease;
        pointer-events: none;
      }
      .cs-dragging .cs-fill,
      .cs-dragging .cs-thumb { transition: none; }
      .cs-pct {
        font-size: 0.78rem; font-weight: 700;
        color: var(--primary-text-color);
        background: rgba(127,127,127,0.14);
        padding: 2px 8px;
        border-radius: 999px;
        min-width: 38px; text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .cs-unavailable { opacity: 0.4; pointer-events: none; filter: grayscale(0.8); }
      @media (max-width: 600px) {
        .cs-panel { min-width: 50px; padding: 8px 4px; gap: 5px; }
        .cs-btn { width: 32px; height: 26px; }
        .cs-slider { width: 30px; }
        .cs-name, .cs-pct { font-size: 0.7rem; }
        .cs-pct { min-width: 32px; padding: 2px 6px; }
      }
    `;
  }
}

if (!customElements.get('cover-slider-row-card')) {
  customElements.define('cover-slider-row-card', CoverSliderRowCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'cover-slider-row-card')) {
  window.customCards.push({
    type: 'cover-slider-row-card',
    name: 'Cover Slider Row',
    description: 'Mehrere Cover als Reihe mit vertikalem Slider, Auf/Ab/Stop und Prozentanzeige.',
    preview: false,
  });
}
