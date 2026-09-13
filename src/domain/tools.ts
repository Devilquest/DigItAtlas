/** The tools built for Dig It!, as the Dig It! Tools dialog lists them. */

/** One tool: its name, whether it is a program or a page, what it does, and where it lives. */
export interface DigItTool {
  name: string;
  kind: string;
  summary: string;
  url: string;
  isThisApp: boolean;
}

/** The author, credited the same way the About dialog credits them, and where the name links to. */
export const AUTHOR = 'Devilquest';
export const AUTHOR_PROFILE = 'https://github.com/Devilquest';

/** The header line, split around the author so that the name itself can be the link. */
export const HEADER_LEAD = 'Free, unofficial tools for Dig It!, all made by ';
export const HEADER_END = '.';

/** What stands in place of a link on the row for the application already open. */
export const HERE_MARKER = 'You are here';

/** Every tool, in the order the dialog shows them, with this application marked. */
export const DIGIT_TOOLS: readonly DigItTool[] = [
  {
    name: 'Dig It! Explorer',
    kind: 'Windows application',
    summary:
      'Browses and reconstructs Dig It! levels, animations, screens, and audio from a local copy with no emulator.',
    url: 'https://github.com/Devilquest/DigItExplorer',
    isThisApp: false,
  },
  {
    name: 'Dig It! Atlas',
    kind: 'Website',
    summary:
      'Maps every Dig It! level in the browser, with layers, entity positions, and interactive navigation.',
    url: 'https://devilquest.github.io/DigItAtlas/',
    isThisApp: true,
  },
  {
    name: 'Dig It! Patcher',
    kind: 'Windows application',
    summary: 'Repairs a damaged copy of Dig It! and fixes bugs in the original version.',
    url: 'https://github.com/Devilquest/DigItPatcher',
    isThisApp: false,
  },
];
