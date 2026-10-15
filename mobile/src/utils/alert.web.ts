import type { AlertButton } from 'react-native';

/**
 * react-native-web ships Alert.alert as a no-op, which would hide validation messages and make
 * "Mark paid" unreachable in the browser. Map it onto the browser's own dialogs instead.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    const text = message ? `${title}\n\n${message}` : title;
    const all = buttons ?? [];
    if (all.length > 1) {
      const cancel = all.find((b) => b.style === 'cancel') ?? all[0];
      const action = [...all].reverse().find((b) => b !== cancel) ?? cancel;
      (window.confirm(text) ? action : cancel).onPress?.();
      return;
    }
    window.alert(text);
    all[0]?.onPress?.();
  },
};
