import pc from 'picocolors';

const tag = pc.bold(pc.blue('[nosam]'));

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

let showTimestamp = true;

export function setShowTimestamp(value: boolean): void {
  showTimestamp = value;
}

function prefix(): string {
  if (!showTimestamp) {
    return tag;
  }
  return `${pc.dim(timeFormat.format())} ${tag}`;
}

export function nosamLog(msg: string): void {
  console.log(`${prefix()} ${msg}`);
}

export function nosamWarn(msg: string): void {
  console.log(`${prefix()} ${pc.yellow(msg)}`);
}

export function nosamError(msg: string): void {
  console.log(`${prefix()} ${pc.red(msg)}`);
}
