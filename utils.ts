export type StyleTypes = 'reset' |
  'bright' |
  'dim' |
  'underscore' |
  'blink' |
  'reverse' |
  'hidden' |

  // foreground color styles
  'fgBlack' |
  'fgRed' |
  'fgGreen' |
  'fgYellow' |
  'fgBlue' |
  'fgMagenta' |
  'fgCyan' |
  'fgWhite' |

  // background color styles
  'bgBlack' |
  'bgRed' |
  'bgGreen' |
  'bgYellow' |
  'bgBlue' |
  'bgMagenta' |
  'bgCyan' |
  'bgWhite';

export type LogStyleTypes = 'error' | 'warning' | 'info' | 'success';

export const styles = {
  // color styles
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  // foreground color styles
  fgBlack: '\x1b[30m',
  fgRed: '\x1b[31m',
  fgGreen: '\x1b[32m',
  fgYellow: '\x1b[33m',
  fgBlue: '\x1b[34m',
  fgMagenta: '\x1b[35m',
  fgCyan: '\x1b[36m',
  fgWhite: '\x1b[37m',

  // background color styles
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

export type ApiResponseType = {
  mys?: {
    code?: number;
    msg?: string;
    data?: {
      access_token: string;
      token_type: string;
      user: any;
      device?: {
        id: string;
        address: string;
        name: string | null;
        type: string;
        serial_number: string;
        series: string;
        version: string;
        network: any;
      };
    }
  };
  err?: {
    code?: number;
    msg?: string;
    why?: string;
  }
}

export const logStyles = {
  error: [styles.bright, styles.fgRed],
  warning: [styles.bright, styles.fgYellow],
  info: [styles.bright, styles.fgCyan],
  success: [styles.bright, styles.fgGreen],
};

export default class TextUtil {

  static txt = (text: string, stylesInput: StyleTypes[]) => {
    let styledText = '';
    stylesInput.forEach((s) => (styledText += styles[s]));
    styledText += text + styles.reset;
    return styledText;
  };

  static logTxt = (text: string, logStyleInput: LogStyleTypes) => {
    return `${logStyles[logStyleInput].join('')}${text}${styles.reset}`;
  };

  static animateLoading = (text: string, run = true) => {
    if (run) {
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let i = 0;
      const interval = setInterval(() => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`${text} ${frames[i]} `);
        i = (i + 1) % frames.length;
      }, 80);
      return () => {
        clearInterval(interval);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      };
    } else {
      console.log(text);
      return () => { };
    }
  };
};

export class Logcat {
  static log = (text: string, ...options: any[]) => {
    if (options) {
      console.log(`${text} `, ...options);
    }
    else {
      console.log(`${text} `);
    }
  };
  static info = (text: string, ...options: any[]) => {
    if (options) {
      console.log(`${TextUtil.logTxt('MYS:', 'info')} ${text} `, ...options);
    }
    else {
      console.log(`${TextUtil.logTxt('MYS:', 'info')} ${text} `);
    }
  };
  static success = (text: string, ...options: any[]) => {
    if (options) {
      console.log(`${TextUtil.logTxt('MYS:', 'success')} ${text} `, ...options);
    }
    else {
      console.log(`${TextUtil.logTxt('MYS:', 'success')} ${text} `);
    }
  };
  static error = (text: string, ...options: any[]) => {
    if (options) {
      console.log(`${TextUtil.logTxt('MYS:', 'error')} ${TextUtil.logTxt(text, 'error')} `, ...options);
    }
    else {
      console.log(`${TextUtil.logTxt('MYS:', 'error')} ${TextUtil.logTxt(text, 'error')} `);
    }
  };
}

// // Using styles with console.log()
// console.log(TextUtil().txt('This text is in red!', ['fgRed']));
// console.log(TextUtil().txt('This text has a yellow background!', ['bgYellow']));
// console.log(TextUtil().txt('This text is in bright style!', ['bright']));

// // example usage
// console.log(TextUtil().txt('Hello, world!', ['fgRed', 'bgBlue', 'underscore']));

// // Using styles with readline

// import readline from 'readline';

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

// rl.question(TextUtil().txt('What is your name? ', ['fgBlue']), (answer: string) => {
//   console.log(`${TextUtil().txt('Hello:', ['fgGreen'])} ${TextUtil().txt(answer + '!', ['fgCyan',])}`);
//   rl.close();

//   const stopAmin = TextUtil().animateLoading(TextUtil().logTxt('Packaging...', 'info'));
//   setTimeout(() => {
//     // Perform packaging process here
//     stopAmin();
//     console.log(TextUtil().logTxt('Package created successfully', 'success'));
//   }, 5000);
// });
