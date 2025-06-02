import markdownStyles from "./markdown-styles.module.css";

type Props = {
  content: string;
};

export function PostBody({ content }: Props) {
  return (
    <div className="max-w-2xl text-left">
      <div
        className={`${markdownStyles["markdown"]} text-left`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
