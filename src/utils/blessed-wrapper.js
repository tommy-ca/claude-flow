/**
 * Blessed UI wrapper with fallback for CI environments
 * Provides mock implementation when blessed is not available
 */

let blessed;
let blessedAvailable = true;

try {
  // Check if we're in CI and should skip native modules
  if (process.env.CI && process.env.SKIP_NATIVE_MODULES === 'true') {
    throw new Error('Native modules skipped in CI');
  }

  // Use dynamic import for optional dependency
  const module = await import('blessed');
  blessed = module.default;
} catch (error) {
  blessedAvailable = false;

  // Only log in non-CI environments or when debugging
  if (!process.env.CI || process.env.DEBUG) {
    console.warn('📦 blessed not available: Using mock UI fallback');
  }

  // Mock blessed implementation for CI/testing
  const mockBlessed = {
    screen: function (options = {}) {
      const screen = {
        title: options.title || '',
        width: options.width || 80,
        height: options.height || 24,
        children: [],
        focused: null,

        append(child) {
          this.children.push(child);
          child.parent = this;
        },

        render() {
          // No-op in mock mode
        },

        destroy() {
          this.children = [];
        },

        key(keys, callback) {
          // Store key bindings but don't actually listen
          this._keys = this._keys || {};
          this._keys[keys] = callback;
        },

        on(event, callback) {
          // Store event handlers
          this._events = this._events || {};
          this._events[event] = callback;
        },

        emit(event, ...args) {
          if (this._events && this._events[event]) {
            this._events[event](...args);
          }
        }
      };

      // Auto-emit resize event
      setTimeout(() => screen.emit('resize'), 0);

      return screen;
    },

    box: function (options = {}) {
      return {
        type: 'box',
        ...options,
        parent: null,
        children: [],

        append(child) {
          this.children.push(child);
          child.parent = this;
        },

        setContent(content) {
          this.content = content;
        },

        setLabel(label) {
          this.label = label;
        },

        focus() {
          if (this.parent) {
            this.parent.focused = this;
          }
        },

        hide() {
          this.hidden = true;
        },

        show() {
          this.hidden = false;
        },

        destroy() {
          this.children = [];
          if (this.parent) {
            const index = this.parent.children.indexOf(this);
            if (index > -1) {
              this.parent.children.splice(index, 1);
            }
          }
        }
      };
    },

    list: function (options = {}) {
      const list = this.box(options);
      list.type = 'list';
      list.items = options.items || [];
      list.selected = 0;

      list.setItems = function (items) {
        this.items = items;
        this.selected = 0;
      };

      list.select = function (index) {
        this.selected = Math.max(0, Math.min(index, this.items.length - 1));
      };

      list.up = function () {
        this.select(this.selected - 1);
      };

      list.down = function () {
        this.select(this.selected + 1);
      };

      return list;
    },

    text: function (options = {}) {
      const text = this.box(options);
      text.type = 'text';
      return text;
    },

    textarea: function (options = {}) {
      const textarea = this.box(options);
      textarea.type = 'textarea';
      textarea.value = options.value || '';

      textarea.setValue = function (value) {
        this.value = value;
        this.setContent(value);
      };

      textarea.getValue = function () {
        return this.value;
      };

      return textarea;
    },

    form: function (options = {}) {
      const form = this.box(options);
      form.type = 'form';

      form.submit = function () {
        if (this.parent) {
          this.parent.emit('submit', this);
        }
      };

      form.reset = function () {
        // Reset form fields
      };

      return form;
    },

    button: function (options = {}) {
      const button = this.box(options);
      button.type = 'button';

      button.press = function () {
        if (this.parent) {
          this.parent.emit('press', this);
        }
      };

      return button;
    },

    loading: function (options = {}) {
      const loading = this.box(options);
      loading.type = 'loading';

      loading.load = function (text) {
        this.setContent(text || 'Loading...');
      };

      loading.stop = function () {
        this.hide();
      };

      return loading;
    },

    // Helper to check if using mock
    isMock: true
  };

  blessed = mockBlessed;
}

// Export wrapper functions
export function createScreen(options) {
  const screen = blessed.screen(options);
  screen.isMock = blessed.isMock || false;
  return screen;
}

export function createBox(options) {
  return blessed.box(options);
}

export function createList(options) {
  return blessed.list(options);
}

export function createText(options) {
  return blessed.text(options);
}

export function createTextarea(options) {
  return blessed.textarea(options);
}

export function createForm(options) {
  return blessed.form(options);
}

export function createButton(options) {
  return blessed.button(options);
}

export function createLoading(options) {
  return blessed.loading(options);
}

export { blessed as default, blessed, blessedAvailable };
