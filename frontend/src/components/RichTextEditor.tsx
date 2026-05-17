import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'dompurify';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'rich-editor__content',
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      const text = instance.getText();
      // Treat an empty paragraph as truly empty so saves don't carry "<p></p>".
      onChange(text.trim().length === 0 ? '' : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', false);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const toggleButton = (
    label: string,
    title: string,
    isActive: boolean,
    action: () => void,
  ) => (
    <button
      type="button"
      title={title}
      className={`rich-editor__btn${isActive ? ' rich-editor__btn--active' : ''}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      {label}
    </button>
  );

  return (
    <div className="rich-editor">
      <div className="rich-editor__toolbar">
        {toggleButton('B', 'Bold', editor.isActive('bold'), () =>
          editor.chain().focus().toggleBold().run(),
        )}
        {toggleButton('I', 'Italic', editor.isActive('italic'), () =>
          editor.chain().focus().toggleItalic().run(),
        )}
        {toggleButton('S', 'Strikethrough', editor.isActive('strike'), () =>
          editor.chain().focus().toggleStrike().run(),
        )}
        {toggleButton('H1', 'Heading 1', editor.isActive('heading', { level: 1 }), () =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
        )}
        {toggleButton('H2', 'Heading 2', editor.isActive('heading', { level: 2 }), () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {toggleButton('•', 'Bullet list', editor.isActive('bulletList'), () =>
          editor.chain().focus().toggleBulletList().run(),
        )}
        {toggleButton('1.', 'Ordered list', editor.isActive('orderedList'), () =>
          editor.chain().focus().toggleOrderedList().run(),
        )}
        {toggleButton('“', 'Quote', editor.isActive('blockquote'), () =>
          editor.chain().focus().toggleBlockquote().run(),
        )}
        {toggleButton('</>', 'Code block', editor.isActive('codeBlock'), () =>
          editor.chain().focus().toggleCodeBlock().run(),
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

interface RichTextProps {
  html?: string | null;
}

export function RichTextView({ html }: RichTextProps) {
  if (!html || html.trim() === '') {
    return <p className="rich-view rich-view--empty">No description</p>;
  }
  const safe = sanitizeHtml(html);
  return (
    <div className="rich-view" dangerouslySetInnerHTML={{ __html: safe }} />
  );
}

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  's',
  'u',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
  'hr',
  'span',
];

function sanitizeHtml(input: string) {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  });
}
