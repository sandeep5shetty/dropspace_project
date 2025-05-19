declare global {
  namespace JSX {
    interface IntrinsicElements {
      "widget-web-component": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        projectid: string;
        theme: string;
        "website-name": string;
      };
    }
  }
}
