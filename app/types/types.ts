export type HTMLField = HTMLInputElement | HTMLTextAreaElement;
export type ChangeEventField = React.ChangeEvent<HTMLField> | { target: { name: string; value: string } };
export type ErrorField = {
  message: string;
  fieldRef: React.RefObject<HTMLField | HTMLDivElement | HTMLLabelElement | null>;
  func: (message: string) => void;
};

export type Size = 'small' | 'medium' | 'large';
