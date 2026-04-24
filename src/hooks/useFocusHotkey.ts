import { useEffect, useRef, useState } from 'react';

export type FocusHotkeyCode =
  | 'AltRight'
  | 'AltLeft'
  | 'MetaRight'
  | 'MetaLeft'
  | 'ControlRight'
  | 'ControlLeft';

export const FOCUS_HOTKEY_OPTIONS: { value: FocusHotkeyCode; label: string }[] =
  [
    { value: 'AltRight', label: 'Right Option (⌥)' },
    { value: 'AltLeft', label: 'Left Option (⌥)' },
    { value: 'MetaRight', label: 'Right Command (⌘)' },
    { value: 'MetaLeft', label: 'Left Command (⌘)' },
    { value: 'ControlRight', label: 'Right Control (⌃)' },
    { value: 'ControlLeft', label: 'Left Control (⌃)' },
  ];

const VALID = new Set<FocusHotkeyCode>(
  FOCUS_HOTKEY_OPTIONS.map((o) => o.value),
);

export function focusHotkeySymbol(code: FocusHotkeyCode): string {
  if (code.startsWith('Alt')) return '⌥';
  if (code.startsWith('Meta')) return '⌘';
  return '⌃';
}
const STORAGE_KEY = 'focus_hotkey';
const DEFAULT: FocusHotkeyCode = 'AltRight';

export function useFocusHotkeySetting() {
  const [code, setCode] = useState<FocusHotkeyCode>(() => {
    const v = localStorage.getItem(STORAGE_KEY) as FocusHotkeyCode | null;
    return v && VALID.has(v) ? v : DEFAULT;
  });

  function save(next: FocusHotkeyCode) {
    localStorage.setItem(STORAGE_KEY, next);
    setCode(next);
  }

  return { code, save };
}

export function useFocusHotkey(code: FocusHotkeyCode, onTap: () => void) {
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  useEffect(() => {
    let pending = false;

    function onDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.code === code && !hasOtherModifier(e, code)) {
        pending = true;
        return;
      }
      pending = false;
    }

    function onUp(e: KeyboardEvent) {
      if (e.code === code && pending) {
        pending = false;
        onTapRef.current();
      } else {
        pending = false;
      }
    }

    function reset() {
      pending = false;
    }

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', reset);
    };
  }, [code]);
}

function hasOtherModifier(e: KeyboardEvent, code: FocusHotkeyCode) {
  const isAlt = code.startsWith('Alt');
  const isMeta = code.startsWith('Meta');
  const isCtrl = code.startsWith('Control');
  if (!isAlt && e.altKey) return true;
  if (!isMeta && e.metaKey) return true;
  if (!isCtrl && e.ctrlKey) return true;
  if (e.shiftKey) return true;
  return false;
}

export function useSearchHotkey(onFocus: () => void) {
  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onFocusRef.current();
      }
    }
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);
}

export function useSlashFocus(onFocus: () => void) {
  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      onFocusRef.current();
    }
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}
