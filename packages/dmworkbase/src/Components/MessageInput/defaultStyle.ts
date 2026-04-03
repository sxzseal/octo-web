import WKApp,{ThemeMode} from "../../App";

/* eslint import/no-anonymous-default-export: [2, {"allowObject": true}] */

export const INPUT_LINE_HEIGHT = 21 // px，font-size 14px * line-height 1.5
export const INPUT_PADDING_V = 10  // px，上下 padding 各 10px
export const INPUT_MIN_ROWS = 1
export const INPUT_DEFAULT_ROWS = 2
export const INPUT_MAX_ROWS = 7

export function calcInputHeight(rows: number): number {
  return rows * INPUT_LINE_HEIGHT + INPUT_PADDING_V * 2
}

export default class InputStyle {

  static getStyle(inputHeight?: number, expanded?: boolean) {
    return { 
      control: {
        fontSize: 14,
        fontWeight: 'normal',
        height: expanded ? '100%' : undefined,
      },
      highlighter: {
        overflow: 'hidden',
        // 高度由 CSS field-sizing: content 接管，JS 不再控制
        minHeight: expanded ? '100%' : calcInputHeight(INPUT_DEFAULT_ROWS),
      },
    
      input: {
        overflow: 'auto',
        height: expanded ? '100%' : undefined,
      },
    
      '&singleLine': {
        control: {
          display: 'inline-block',
    
          width: 130,
        },
    
        highlighter: {
          padding: 1,
          border: '2px inset transparent',
        },
    
        input: {
          padding: 1,
    
          border: '0px inset',
        },
      },
    
      '&multiLine': {
        control: {
          fontFamily: 'monospace',
          border: '0px solid silver',
          height: expanded ? '100%' : 'auto',
          minHeight: expanded ? undefined : calcInputHeight(INPUT_DEFAULT_ROWS),
          maxHeight: expanded ? undefined : calcInputHeight(INPUT_MAX_ROWS),
          overflowY: expanded ? undefined : 'auto',
        },
    
        highlighter: {
          padding: 9,
          minHeight: calcInputHeight(INPUT_DEFAULT_ROWS),
          overflow: 'hidden',
        },
    
        input: {
          padding: 10,
          minHeight: calcInputHeight(INPUT_DEFAULT_ROWS),
          outline: 0,
          border: 0,
          overflowY: 'auto',
          height: 'auto',
        },
      },
    
      suggestions: {
        list: {
          backgroundColor: "var(--wk-color-item)",
          // border: '1px solid rgba(0,0,0,0.15)',
          boxShadow: WKApp.config.themeMode === ThemeMode.dark?"15px 15px 15px -15px #000, -15px -15px 15px -15px #000":'15px 15px 15px -15px #eee, -15px -15px 15px -15px #eee',
          fontSize: 14,
          zIndex: 9999,
          padding: '5px 0px 5px 0px',
          minWidth: '420px',
          maxHeight: '220px',
          // borderRadius: '5px',
          overflowY:'auto',
          overflowX: 'hidden',
        },
    
        item: {
          zIndex: 9999,
          padding: '5px 0px',
          marginBottom: "10px",
          borderBottom: '0px solid rgba(0,0,0,0.15)',
    
          '&focused': {
            backgroundColor: '#E0540E',
          },
        },
      },
    }
  }
}

