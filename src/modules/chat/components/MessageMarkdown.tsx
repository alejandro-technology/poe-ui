import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const components: Components = {
  a({ node: _node, ...props }) {
    return <a {...props} rel="noreferrer noopener" target="_blank" />;
  },
};

export interface MessageMarkdownProps {
  content: string;
}

export function MessageMarkdown({ content }: MessageMarkdownProps) {
  return (
    <div className="message-markdown wrap-anywhere">
      <Markdown
        components={components}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {content}
      </Markdown>
    </div>
  );
}
