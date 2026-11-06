(function () {
    'use strict';

    const APP_ID = 'RedacaoBypass';
    const REQUIRED_PATH = '/student-write-essay';
    const LOGO_DATA = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663662200006/PJvLyPWAFCwDcimv.png';

    // =================================================================
    // 1. UTILITÁRIOS
    // =================================================================
    const Utils = {
        setCookie: (name, value, days = 365) => {
            const d = new Date();
            d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
            document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
        },
        getCookie: (name) => {
            const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            return v ? v[2] : null;
        },
        loadScript: (src, id) => {
            return new Promise((resolve, reject) => {
                if (document.getElementById(id)) return resolve();
                const s = document.createElement('script');
                s.id = id; s.src = src; s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        },
        isTitleField: (element) => {
            if (!element) return false;
            if (element.tagName === 'INPUT' && element.type === 'text') {
                const parent = element.closest('.MuiFormControl-root');
                if (parent && parent.querySelector('label')?.textContent.includes('Título')) return true;
                if (element.getAttribute('maxlength') === '100') return true;
            }
            return false;
        },
        scrapeAssignmentData: () => {
            const getTextByLabel = (lbl) => {
                const all = Array.from(document.querySelectorAll('p.MuiTypography-root'));
                const node = all.find(p => p.textContent.trim() === lbl);
                if (node && node.nextElementSibling) return node.nextElementSibling.textContent.trim();
                if (node && node.parentElement) {
                     const siblings = Array.from(node.parentElement.children);
                     const idx = siblings.indexOf(node);
                     if (siblings[idx + 1]) return siblings[idx + 1].textContent.trim();
                }
                return null;
            };
            const getSection = (txt) => {
                const all = Array.from(document.querySelectorAll('p.MuiTypography-root'));
                const head = all.find(p => p.textContent.trim().includes(txt));
                if (!head) return '';
                let container = head.closest('.MuiBox-root');
                if (container && container.nextElementSibling) {
                    let next = container.nextElementSibling;
                    while(next && next.textContent.trim() === '') next = next.nextElementSibling;
                    if (next) return next.textContent.trim();
                }
                return '';
            };
            return {
                tema: getTextByLabel('Tema:') || 'Tema Livre',
                genero: getTextByLabel('Gênero:') || 'Dissertação',
                palavras: getTextByLabel('Número de palavras:') || '20 linhas',
                textoApoio: getSection('ENUNCIADO') + ' ' + getSection('TEXTO DE APOIO')
            };
        }
    };

    // =================================================================
    // 2. LIMPEZA
    // =================================================================
    if (window[APP_ID]) {
        window[APP_ID].destroy();
        delete window[APP_ID];
    }

    // =================================================================
    // 3. ESTILOS — Preto real forte + contraste branco/cinza claro
    // =================================================================
    const styleId = `${APP_ID}_styles`;
    document.getElementById(styleId)?.remove();

    const css = `
        :root {
            --rb-bg: rgba(0, 0, 0, 0.92);
            --rb-surface: rgba(0, 0, 0, 0.95);
            --rb-border: rgba(255, 255, 255, 0.12);
            --rb-text: #E8E8E8;
            --rb-muted: #808080;
            --rb-white: #FFFFFF;
            --rb-black: #000000;
            --rb-primary: #FFFFFF;
            --rb-primary-hover: #E0E0E0;
            --rb-danger: #E53935;
            --rb-font: 'Inter', 'SF Pro Display', 'Segoe UI', sans-serif;
            --rb-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
        }

        #${APP_ID}_overlay {
            position: fixed; top: 60px; left: 20px; z-index: 999999;
            font-family: var(--rb-font);
        }

        .rb-panel {
            background: var(--rb-bg); color: var(--rb-text);
            backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
            padding: 18px; border-radius: 16px;
            width: 340px; max-width: calc(100vw - 32px); box-shadow: var(--rb-shadow); border: 1px solid var(--rb-border);
            display: flex; flex-direction: column; gap: 14px;
            animation: rbFadeIn 0.25s ease-out;
        }
        @media (max-width: 400px) {
            .rb-panel { width: calc(100vw - 24px); padding: 14px; gap: 10px; }
            .rb-bubble { width: 44px; height: 44px; }
            .rb-bubble img { width: 22px; height: 22px; }
        }

        .rb-bubble {
            width: 52px; height: 52px;
            background: rgba(0, 0, 0, 0.95); border: 1px solid var(--rb-border);
            backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: grab; box-shadow: var(--rb-shadow);
            user-select: none; z-index: 1000000; position: fixed;
            animation: rbPopIn 0.3s ease-out;
            transition: box-shadow 0.2s ease, transform 0.15s ease;
        }
        .rb-bubble:hover { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9); transform: scale(1.05); }
        .rb-bubble:active { cursor: grabbing; }
        .rb-bubble img { width: 28px; height: 28px; border-radius: 50%; pointer-events: none; object-fit: cover; }

        .rb-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 8px 10px; background: rgba(255,255,255,0.03); border-radius: 12px;
            cursor: grab; user-select: none;
        }
        .rb-header:active { cursor: grabbing; }
        .rb-header-logo { width: 22px; height: 22px; margin-right: 8px; border-radius: 4px; }

        .rb-header-controls { display: flex; gap: 8px; align-items: center; }

        .rb-win-btn {
            cursor: pointer; font-size: 14px; width: 28px; height: 28px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%; font-weight: 500; position: relative; z-index: 1000;
            transition: background 0.2s ease, color 0.2s ease;
        }
        .rb-btn-min { color: var(--rb-muted); background: rgba(255,255,255,0.04); }
        .rb-btn-min:hover { background: rgba(255,255,255,0.12); color: var(--rb-white); }
        .rb-btn-close { color: var(--rb-muted); background: rgba(255,255,255,0.04); }
        .rb-btn-close:hover { background: rgba(255,255,255,0.12); color: var(--rb-danger); }

        .rb-error-modal {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: var(--rb-bg); color: var(--rb-text);
            backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
            padding: 28px; border-radius: 16px;
            width: 320px; text-align: center; border: 1px solid var(--rb-danger);
            z-index: 10000000;
        }

        .rb-title { font-size: 13px; font-weight: 600; color: var(--rb-white); letter-spacing: 0.5px; }
        .rb-field-badge { font-size: 9px; padding: 2px 7px; border-radius: 4px; font-weight: 600; margin-left: 8px; }
        .rb-badge-title { background: #D4A017; color: #000; }
        .rb-badge-body { background: var(--rb-primary); color: #000; }

        .rb-input, .rb-textarea {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.3);
            color: var(--rb-white);
            border-radius: 10px;
            font-size: 13px; font-family: inherit; outline: none;
            width: 100%; box-sizing: border-box;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 0 8px rgba(255,255,255,0.08);
        }
        .rb-textarea:focus, .rb-input:focus { border-color: var(--rb-white); }
        .rb-textarea { padding: 10px; height: 100px; resize: none; }
        .rb-input { padding: 8px 10px; margin-bottom: 8px; }
        .rb-input::placeholder, .rb-textarea::placeholder { color: var(--rb-muted); }

        .rb-chips-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 4px; }
        .rb-chip {
            background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: var(--rb-muted);
            padding: 7px 0; border-radius: 10px; font-size: 11px; font-weight: 600; cursor: pointer; text-align: center;
            transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .rb-chip:hover { background: rgba(255,255,255,0.10); color: var(--rb-white); }
        .rb-chip.active { background: var(--rb-primary); color: var(--rb-black); border-color: var(--rb-white); }

        .rb-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
        .rb-btn {
            border: 1px solid rgba(255,255,255,0.08);
            padding: 9px; border-radius: 10px;
            cursor: pointer; font-weight: 600; font-size: 12px;
            display: flex; align-items: center; justify-content: center; gap: 6px;
            transition: all 0.2s ease;
            background: rgba(255,255,255,0.04);
            color: var(--rb-text);
        }
        .rb-btn:hover { background: rgba(255,255,255,0.10); color: var(--rb-white); box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
        .rb-btn-primary { background: var(--rb-white); color: var(--rb-black); border-color: var(--rb-white); }
        .rb-btn-primary:hover { background: var(--rb-primary-hover); color: var(--rb-black); border-color: var(--rb-primary-hover); }
        .rb-btn-ai { width: 100%; background: rgba(255,255,255,0.04); color: var(--rb-text); border: 1px solid rgba(255,255,255,0.08); margin-bottom: 4px; }
        .rb-btn-ai:hover { background: rgba(255,255,255,0.10); color: var(--rb-white); }
        .rb-btn-action { background: rgba(255,255,255,0.04); color: var(--rb-text); border: 1px solid rgba(255,255,255,0.08); }

        .rb-progress-bar { height: 3px; background: var(--rb-white); width: 0%; transition: width 0.1s linear; }

        .rb-toast {
            position: fixed; top: 10%; left: 50%; transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.95); color: var(--rb-white); padding: 12px 22px; border-radius: 12px;
            backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
            z-index: 1000000; border: 1px solid rgba(255,255,255,0.12); display: flex; gap: 8px; pointer-events: none;
            box-shadow: var(--rb-shadow);
        }

        .rb-highlighter {
            position: absolute; pointer-events: none; border: 2px solid rgba(255,255,255,0.7);
            background: rgba(255, 255, 255, 0.08); z-index: 999990; border-radius: 6px;
            box-shadow: 0 0 12px rgba(255,255,255,0.3);
        }

        .rb-footer { font-size: 10px; color: var(--rb-muted); text-align: center; margin-top: 8px; letter-spacing: 0.3px; }
        .rb-footer a { color: var(--rb-white); text-decoration: none; }

        .rb-ai-section { position: relative; min-height: 60px; }
        .rb-ai-blocked {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.90); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            border-radius: 10px; z-index: 10; gap: 10px;
        }

        @keyframes rbFadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rbPopIn { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .rb-panel::-webkit-scrollbar { width: 8px; }
        .rb-panel::-webkit-scrollbar-track { background: transparent; }
        .rb-panel::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.15);
            border-radius: 10px; border: 2px solid transparent; background-clip: content-box;
        }
        .rb-panel::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.28); }

        .rb-intro-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
            z-index: 99999999; display: flex; flex-direction: column;
            align-items: center; justify-content: center; color: white;
            font-family: var(--rb-font); transition: opacity 1s ease;
        }

        .rb-intro-logo {
            width: 80px; height: 80px; border-radius: 16px;
            opacity: 0; transform: scale(0.7);
            transition: all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
            box-shadow: 0 8px 32px rgba(255,255,255,0.15);
        }
        .rb-intro-logo.visible { opacity: 1; transform: scale(1); }

        .rb-intro-loader {
            margin-top: 36px; width: 260px; opacity: 0;
            transition: opacity 0.6s ease; text-align: center;
        }
        .rb-intro-loader.visible { opacity: 1; }

        .rb-intro-progress-track {
            width: 100%; height: 2px; background: rgba(255,255,255,0.08);
            border-radius: 10px; overflow: hidden; margin-bottom: 16px;
        }
        .rb-intro-progress-fill {
            width: 0%; height: 100%; background: #fff;
            box-shadow: 0 0 12px rgba(255,255,255,0.5);
            transition: width 0.2s linear;
        }

        .rb-intro-status {
            font-size: 11px; font-weight: 400; letter-spacing: 1px;
            color: rgba(255,255,255,0.5); height: 18px;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    class RedacaoBypassEngine {
        constructor() {
            this.state = {
                target: null, isTargetTitle: false, text: '', speed: 40,
                isPaused: false, isTyping: false, index: 0,
                essayTitle: '',
                isMinimized: false,
                isIAAuthenticated: Utils.getCookie('rb_ia_auth') === '1',
                hasSelectedField: false
            };
            this.dragState = { isDragging: false };
            this.ui = null; this.toastEl = null; this.highlighter = null;
            this.icons = {
                'settings': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/></svg>`,
                'play': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
                'stop': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/></svg>`,
                'pause': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2"/></svg>`,
                'close': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
                'minimize': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
                'ai': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14.09 8.26L20 9.27L15.5 13.97L16.91 20L12 16.9L7.09 20L8.5 13.97L4 9.27L9.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
                'refresh': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
                'info': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
                'lock': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/></svg>`,
                'pointer': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L5.5 3.21Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
                'default': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
            };
            this.handleSelection = this.handleSelection.bind(this);
            this.init();
        }

        getIcon(name) {
            return this.icons[name] || this.icons['default'];
        }

        async init() {
            if (!window.location.href.includes(REQUIRED_PATH)) {
                this.showErrorModal(); return;
            }
            try {
                await Promise.all([
                    Utils.loadScript("https://cdn.jsdelivr.net/npm/darkreader@4.9.92/darkreader.min.js", "dr"),
                    Utils.loadScript("https://js.puter.com/v2/", "puter-js")
                ]);
                if (window.DarkReader) {
                    window.DarkReader.setFetchMethod(window.fetch);
                    window.DarkReader.enable({ brightness: 100, contrast: 90, sepia: 10 });
                }
            } catch (_) {}

            this.createOverlay();
            this.showIntroAnimation();
        }

        showIntroAnimation() {
            const overlay = document.createElement('div');
            overlay.className = 'rb-intro-overlay';
            overlay.innerHTML = `
                <img src="${LOGO_DATA}" class="rb-intro-logo" id="rb-intro-logo">
                <div class="rb-intro-loader" id="rb-intro-loader">
                    <div class="rb-intro-progress-track"><div class="rb-intro-progress-fill" id="rb-intro-progress"></div></div>
                    <div class="rb-intro-status" id="rb-intro-status">INICIALIZANDO</div>
                </div>
            `;
            document.body.appendChild(overlay);

            setTimeout(() => {
                const logo = document.getElementById('rb-intro-logo');
                if(logo) logo.classList.add('visible');
                setTimeout(() => {
                    const loader = document.getElementById('rb-intro-loader');
                    if(loader) loader.classList.add('visible');
                    let progress = 0;
                    const phrases = ['Carregando...', 'Preparando...', 'Conectando...', 'Finalizando...'];
                    let phraseIndex = 0;
                    const statusEl = document.getElementById('rb-intro-status');
                    const interval = setInterval(() => {
                        progress += 1;
                        const fill = document.getElementById('rb-intro-progress');
                        if(fill) fill.style.width = progress + '%';
                        if (progress % 25 === 0 && phraseIndex < phrases.length) {
                            if(statusEl) statusEl.innerText = phrases[phraseIndex++];
                        }
                        if (progress >= 100) {
                            clearInterval(interval);
                            setTimeout(() => {
                                overlay.style.opacity = '0';
                                setTimeout(() => {
                                    overlay.remove();
                                    this.showToast(`${this.getIcon("pointer")} Clique em um campo de texto para selecionar`, true);
                                    this.enableSelectionMode();
                                }, 1000);
                            }, 500);
                        }
                    }, 35);
                }, 1500);
            }, 200);
        }

        showErrorModal() {
            const modal = document.createElement('div');
            modal.className = 'rb-error-modal';
            modal.innerHTML = `<h3 style="color:#E53935; font-size:16px; font-weight:600; margin-bottom:8px">Local Inválido</h3><p style="font-size:13px; color:var(--rb-muted); margin-bottom:16px">Use na página de redação.</p><button id="rb-err-close" class="rb-btn rb-btn-action" style="margin:0 auto">OK</button>`;
            document.body.appendChild(modal);
            document.getElementById('rb-err-close').onclick = () => { modal.remove(); this.destroy(); };
        }

        createOverlay() {
            const el = document.createElement('div');
            el.id = `${APP_ID}_overlay`;
            document.body.appendChild(el);
            this.ui = el;
        }

        showToast(msg, persistent = false) {
            if (this.toastEl) this.toastEl.remove();
            this.toastEl = document.createElement('div');
            this.toastEl.className = 'rb-toast';
            this.toastEl.innerHTML = `<span style="color:var(--rb-white)">${msg}</span>`;
            document.body.appendChild(this.toastEl);
            if (!persistent) {
                setTimeout(() => { if(this.toastEl) this.toastEl.remove(); }, 3500);
            }
        }

        applyDrag(handle, container) {
            let startX, startY, initialLeft, initialTop;

            const onDown = (e) => {
                if (e.target.closest('.rb-win-btn')) return;
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
                if(e.type === 'touchstart') document.body.style.overflow = 'hidden';

                this.dragState.isDragging = true;
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                startX = clientX;
                startY = clientY;

                const rect = container.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                container.style.right = 'auto';
                container.style.bottom = 'auto';
            };

            const onMove = (e) => {
                if (!this.dragState.isDragging) return;
                e.preventDefault();
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                const dx = clientX - startX;
                const dy = clientY - startY;
                container.style.left = `${initialLeft + dx}px`;
                container.style.top = `${initialTop + dy}px`;
            };

            const onUp = () => {
                this.dragState.isDragging = false;
                document.body.style.overflow = '';
            };

            handle.addEventListener('mousedown', onDown);
            handle.addEventListener('touchstart', onDown, {passive: false});
            document.addEventListener('mousemove', onMove);
            document.addEventListener('touchmove', onMove, {passive: false});
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchend', onUp);
        }

        // --- Bolinha Flutuante com LOGO ---
        renderBubble() {
            if (!this.ui) return;
            this.ui.className = 'rb-bubble';
            this.ui.innerHTML = `<img src="${LOGO_DATA}" alt="logo">`;
            this.ui.style.position = 'fixed';

            this.applyDrag(this.ui, this.ui);

            let startPos = {x:0, y:0};
            this.ui.onmousedown = (e) => { startPos = {x: e.clientX, y: e.clientY}; };
            this.ui.ontouchstart = (e) => { const t = e.touches[0]; startPos = {x: t.clientX, y: t.clientY}; };
            this.ui.onclick = (e) => {
                if (Math.abs(e.clientX - startPos.x) < 8 && Math.abs(e.clientY - startPos.y) < 8) {
                    this.showPanel();
                }
            };
            this.ui.ontouchend = (e) => {
                const t = e.changedTouches[0];
                if (Math.abs(t.clientX - startPos.x) < 8 && Math.abs(t.clientY - startPos.y) < 8) {
                    this.showPanel();
                }
            };
        }

        showPanel() {
            this.state.isMinimized = false;
            this.renderConfigPanel();
        }

        toggleMinimize() {
            this.state.isMinimized = !this.state.isMinimized;
            if (this.state.isMinimized) this.renderBubble();
            else this.renderConfigPanel();
        }

        // --- Painel de Configuração ---
        renderConfigPanel() {
            if (!this.ui) return;
            this.ui.className = 'rb-panel';
            this.ui.style.position = 'fixed';

            const fieldBadge = this.state.isTargetTitle ?
                `<span class="rb-field-badge rb-badge-title">TÍTULO</span>` :
                `<span class="rb-field-badge rb-badge-body">REDAÇÃO</span>`;

            const isLocked = !this.state.isIAAuthenticated;

            this.ui.innerHTML = `
                <div class="rb-header">
                    <div style="display:flex; align-items:center; pointer-events:none;">
                        <img src="${LOGO_DATA}" class="rb-header-logo" alt="logo">
                        <span class="rb-title">SCRIPTANDO BYPASS</span> ${this.state.hasSelectedField ? fieldBadge : ''}
                    </div>
                    <div class="rb-header-controls">
                        <div id="rb-minimize" class="rb-win-btn rb-btn-min">${this.getIcon("minimize")}</div>
                        <div id="rb-close" class="rb-win-btn rb-btn-close">${this.getIcon("close")}</div>
                    </div>
                </div>

                <div class="rb-ai-section">
                    ${isLocked ? `
                    <div id="rb-ai-block" class="rb-ai-blocked">
                        <span style="color:var(--rb-muted); font-size:12px;">${this.getIcon("lock")} Conecte-se para usar a IA</span>
                        <button id="rb-login-ai" class="rb-btn rb-btn-primary" style="width:auto; padding:6px 16px;">Conectar</button>
                    </div>` : ''}
                    <input type="text" id="rb-essay-title" class="rb-input" placeholder="Título da Redação..." value="${this.state.essayTitle}" style="${isLocked ? 'pointer-events:none; opacity:0.35;' : ''}">
                    <button id="rb-generate-ai" class="rb-btn rb-btn-ai" style="${isLocked ? 'pointer-events:none; opacity:0.35;' : ''}">${this.getIcon("ai")} Gerar Redação</button>
                </div>

                <textarea id="rb-input" class="rb-textarea" placeholder="Cole o texto aqui ou aguarde a geração...">${this.state.text}</textarea>

                <div class="rb-chips-grid">
                    <div class="rb-chip" data-val="60">Lento</div>
                    <div class="rb-chip active" data-val="40">Normal</div>
                    <div class="rb-chip" data-val="10">Flash</div>
                </div>

                <div class="rb-controls">
                    <button id="rb-start" class="rb-btn rb-btn-primary">${this.getIcon("play")} DIGITAR</button>
                    <button id="rb-select-new" class="rb-btn rb-btn-action">${this.getIcon("refresh")} Trocar</button>
                </div>

                <div id="rb-running-controls" style="display:none; grid-template-columns: 1fr 1fr; gap:8px">
                    <button id="rb-pause" class="rb-btn rb-btn-action">${this.getIcon("pause")} Pausar</button>
                    <button id="rb-stop" class="rb-btn rb-btn-action" style="color:var(--rb-danger);">${this.getIcon("stop")} Parar</button>
                </div>

                <div style="height:3px; background:#222; border-radius:2px; margin-top:4px"><div id="rb-bar" class="rb-progress-bar"></div></div>
                <div class="rb-footer">Made by <a href="https://instagram.com/gabrieldacechen_" target="_blank" rel="noopener">Pajé</a></div>
            `;

            const header = this.ui.querySelector('.rb-header');
            this.applyDrag(header, this.ui);

            const qs = (s) => this.ui.querySelector(s);

            qs('#rb-minimize').onclick = (e) => { e.stopPropagation(); this.toggleMinimize(); };
            qs('#rb-close').onclick = (e) => { e.stopPropagation(); this.destroy(); };
            qs('#rb-select-new').onclick = () => {
                this.state.hasSelectedField = false;
                this.state.target = null;
                this.state.isTargetTitle = false;
                this.ui.innerHTML = '';
                this.enableSelectionMode();
            };

            // Login na IA
            const loginBtn = qs('#rb-login-ai');
            if (loginBtn) {
                loginBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const btn = qs('#rb-login-ai');
                    btn.disabled = true; btn.textContent = 'Conectando...';
                    try {
                        if (!puter.auth.isSignedIn()) {
                            await puter.auth.signIn();
                        }
                        if (puter.auth.isSignedIn()) {
                            this.state.isIAAuthenticated = true;
                            Utils.setCookie('rb_ia_auth', '1', 365);
                            const block = qs('#rb-ai-block');
                            if (block) block.remove();
                            const titleInput = qs('#rb-essay-title');
                            const genBtn = qs('#rb-generate-ai');
                            if (titleInput) { titleInput.style.pointerEvents = ''; titleInput.style.opacity = ''; }
                            if (genBtn) { genBtn.style.pointerEvents = ''; genBtn.style.opacity = ''; }
                            this.showToast('Conectado com sucesso');
                        }
                    } catch(err) {
                        console.error(err);
                    } finally {
                        if (btn && !btn.disabled) { btn.disabled = false; btn.textContent = 'Conectar'; }
                    }
                };
            }

            qs('#rb-essay-title').oninput = (e) => this.state.essayTitle = e.target.value;
            qs('#rb-input').oninput = (e) => this.state.text = e.target.value;

            qs('#rb-generate-ai').onclick = async () => {
                if(!this.state.essayTitle) return this.showToast('Digite o título da redação');

                const btn = qs('#rb-generate-ai');
                const originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = `${this.getIcon("info")} Conectando...`;

                try {
                    if (!puter.auth.isSignedIn()) {
                        this.state.isIAAuthenticated = false;
                        Utils.setCookie('rb_ia_auth', '0');
                        this.renderConfigPanel();
                        return;
                    }

                    btn.innerHTML = `${this.getIcon("info")} Gerando...`;
                    const data = Utils.scrapeAssignmentData();
                    const prompt = this.buildPrompt(data, this.state.essayTitle, this.state.isTargetTitle);

                    const response = await puter.ai.chat(prompt);
                    const txt = response.toString().trim();

                    this.state.text = txt;
                    qs('#rb-input').value = txt;
                    this.showToast('Redação gerada com sucesso');
                } catch(e) {
                    console.error(e);
                    this.showToast('Erro ao gerar: ' + e.message);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            };

            qs('#rb-start').onclick = () => {
                const t = qs('#rb-input').value;
                if(!t) return;
                this.state.text = t;
                qs('.rb-controls').style.display = 'none';
                qs('#rb-running-controls').style.display = 'grid';
                this.runTyping(t);
            };

            const chips = this.ui.querySelectorAll('.rb-chip');
            chips.forEach(c => c.onclick = () => {
                chips.forEach(x => x.classList.remove('active')); c.classList.add('active');
                this.state.speed = parseInt(c.dataset.val);
            });

            qs('#rb-pause').onclick = () => {
                this.state.isPaused = !this.state.isPaused;
                qs('#rb-pause').innerHTML = this.state.isPaused
                    ? `${this.getIcon("play")} Retomar`
                    : `${this.getIcon("pause")} Pausar`;
            };
            qs('#rb-stop').onclick = () => { this.state.isTyping = false; };
        }

        buildPrompt(data, title, isTitleOnly) {
            if (isTitleOnly) {
                return `Gere apenas um título criativo e impactante para uma redação com o tema: "${data.tema}". Retorne apenas o texto do título, sem aspas.`;
            }

            return `
                Você é um estudante brasileiro do ensino médio escrevendo uma redação nota 1000.
                TEMA: ${data.tema}
                TÍTULO ESCOLHIDO: ${title}
                GÊNERO: ${data.genero}
                TAMANHO: ${data.palavras}
                TEXTO DE APOIO: ${data.textoApoio}

                REGRAS CRÍTICAS:
                1. NÃO COLOQUE O TÍTULO NO CORPO DO TEXTO.
                2. Comece direto no primeiro parágrafo.
                3. NÃO use markdown (sem negritos, sem itálicos, sem #). Apenas texto cru.
                4. Use uma linguagem natural, humanizada, com pequenas imperfeições estilísticas típicas de um excelente aluno, mas que não pareça um robô.
                5. Respeite a estrutura dissertativa-argumentativa (Introdução, Desenvolvimento, Proposta de Intervenção).
                6. Evite clichês excessivos de IA como "Em suma", "Ademais", "Portanto" no início de cada frase. Varie os conectivos.

                SUB-PROMPT DE HUMANIZAÇÃO:
                Escreva como se estivesse sob pressão de tempo, focando em argumentos sólidos e vocabulário rico, porém acessível. O texto deve fluir organicamente, sem listas ou divisões artificiais.
            `;
        }

        enableSelectionMode() {
            document.body.style.cursor = 'crosshair';
            document.addEventListener('click', this.handleSelection, true);
            document.addEventListener('mouseover', this.handleHover, true);
            // Adicionar contorno brilhante em todas as caixas de texto principais da página
            document.body.classList.add('rb-selecting');
            this._fieldHighlightStyle = document.createElement('style');
            this._fieldHighlightStyle.textContent = `
                .rb-selecting input[type="text"],
                .rb-selecting input[type="email"],
                .rb-selecting input[type="password"],
                .rb-selecting textarea,
                .rb-selecting [contenteditable="true"],
                .rb-selecting .MuiInputBase-root,
                .rb-selecting .MuiFormControl-root textarea,
                .rb-selecting [role="textbox"] {
                    outline: 2px solid rgba(255,255,255,0.6) !important;
                    box-shadow: 0 0 16px rgba(255,255,255,0.2) !important;
                    border-radius: 8px !important;
                    transition: box-shadow 0.3s ease !important;
                }
                .rb-selecting .MuiOutlinedInput-root {
                    outline: 2px solid rgba(255,255,255,0.6) !important;
                    box-shadow: 0 0 16px rgba(255,255,255,0.2) !important;
                    outline-offset: 2px;
                }
            `;
            document.head.appendChild(this._fieldHighlightStyle);
        }

        disableSelectionMode() {
            document.body.style.cursor = '';
            document.body.classList.remove('rb-selecting');
            document.removeEventListener('click', this.handleSelection, true);
            document.removeEventListener('mouseover', this.handleHover, true);
            if(this.highlighter) this.highlighter.remove();
            if(this._fieldHighlightStyle) { this._fieldHighlightStyle.remove(); this._fieldHighlightStyle = null; }
        }

        handleHover = (e) => {
            if(this.ui?.contains(e.target)) return;
            if(!this.highlighter) {
                this.highlighter = document.createElement('div');
                this.highlighter.className = 'rb-highlighter';
                document.body.appendChild(this.highlighter);
            }
            const r = e.target.getBoundingClientRect();
            Object.assign(this.highlighter.style, {
                top: (r.top + window.scrollY) + 'px',
                left: (r.left + window.scrollX) + 'px',
                width: r.width + 'px',
                height: r.height + 'px'
            });
        }

        handleSelection(e) {
            e.preventDefault(); e.stopPropagation();
            const t = e.target;
            if(!t.isContentEditable && t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') return;
            this.state.target = t;
            this.state.isTargetTitle = Utils.isTitleField(t);
            this.state.hasSelectedField = true;
            this.disableSelectionMode();
            if(this.toastEl) { this.toastEl.remove(); this.toastEl = null; }
            this.renderConfigPanel();
        }

        forceReactChange(el, val) {
            const proto = (el.tagName === 'TEXTAREA') ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if(setter) setter.call(el, val); else el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }

        async runTyping(text) {
            this.state.isTyping = true; this.state.index = 0;
            const tgt = this.state.target; tgt.focus();
            if(tgt.value !== undefined) this.forceReactChange(tgt, '');

            while(this.state.index < text.length && this.state.isTyping) {
                if(this.state.isPaused) { await new Promise(r => setTimeout(r, 200)); continue; }
                const c = text[this.state.index];
                if(tgt.value !== undefined) {
                    const s = tgt.selectionStart;
                    const v = tgt.value;
                    this.forceReactChange(tgt, v.slice(0, s) + c + v.slice(tgt.selectionEnd));
                    tgt.selectionStart = tgt.selectionEnd = s + 1;
                } else document.execCommand('insertText', false, c);

                this.state.index++;
                const bar = this.ui.querySelector('#rb-bar');
                if(bar) bar.style.width = (this.state.index / text.length * 100) + '%';
                await new Promise(r => setTimeout(r, this.state.speed + Math.random() * 10));
            }
            if(this.state.isTyping) this.finish();
        }

        async finish() {
            this.state.isTyping = false;
            this.showToast('Salvando...');
            const tgt = this.state.target;
            if(tgt && tgt.value !== undefined) {
                const v = tgt.value;
                this.forceReactChange(tgt, v + ' ');
                await new Promise(r => setTimeout(r, 100));
                this.forceReactChange(tgt, v);
            }
            await new Promise(r => setTimeout(r, 500));

            let btn = document.querySelector('button[aria-label="SALVAR RASCUNHO"]');
            if(!btn) btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes("SALVAR RASCUNHO"));
            if(btn) {
                if(btn.disabled) { btn.disabled = false; btn.removeAttribute('disabled'); }
                btn.click(); this.showToast('Salvo com sucesso');
            }

            const bCtrl = this.ui.querySelector('#rb-running-controls');
            if(bCtrl) bCtrl.style.display = 'none';
            const bStart = this.ui.querySelector('.rb-controls');
            if(bStart) bStart.style.display = 'grid';
            const inp = this.ui.querySelector('#rb-input');
            if(inp) inp.disabled = false;
        }

        destroy() {
            this.state.isTyping = false;
            this.disableSelectionMode();
            if(this.toastEl) this.toastEl.remove();
            if(this.ui) this.ui.remove();
            window[APP_ID] = null;
        }
    }

    window[APP_ID] = new RedacaoBypassEngine();

})();
