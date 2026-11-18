import pc from 'picocolors';

const tag = pc.bold(pc.blue('[bwf]'));

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

export function bwfLog(msg: string): void {
  console.log(`${prefix()} ${msg}`);
}

export function bwfWarn(msg: string): void {
  console.log(`${prefix()} ${pc.yellow(msg)}`);
}

export function bwfError(msg: string): void {
  console.log(`${prefix()} ${pc.red(msg)}`);
}
