/**
 * Event Types
 * Sprint 10 - Fase 3: Tipar callbacks e handlers
 */

export type EventHandler<T = void> = (event: T) => void;
export type AsyncEventHandler<T = void> = (event: T) => Promise<void>;

export interface FormChangeEvent<T = string> {
  target: {
    name: string;
    value: T;
  };
}

export interface SelectChangeEvent {
  value: string;
  label: string;
}

export interface FileChangeEvent {
  files: FileList | null;
}

export type InputChangeHandler = EventHandler<React.ChangeEvent<HTMLInputElement>>;
export type TextareaChangeHandler = EventHandler<React.ChangeEvent<HTMLTextAreaElement>>;
export type SelectChangeHandler = EventHandler<string>;
export type SubmitHandler<T = unknown> = AsyncEventHandler<T>;
export type ClickHandler = EventHandler<React.MouseEvent>;
export type KeyPressHandler = EventHandler<React.KeyboardEvent>;
