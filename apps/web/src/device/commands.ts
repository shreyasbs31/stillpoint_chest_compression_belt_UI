export const commands = {
  stop: '0',
  inflate: '1',
  deflate: '2',
  zero: 't',
  status: '?',
} as const;

export type CommandName = keyof typeof commands;
