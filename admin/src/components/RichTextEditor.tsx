import { useEffect, useRef } from 'react';
import { useQuill } from 'react-quilljs';
import 'quill/dist/quill.snow.css';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const { quill, quillRef } = useQuill({
    theme: 'snow',
    placeholder: placeholder || 'İçerik girin...',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        ['blockquote', 'code-block'],
        [{ color: [] }, { background: [] }],
        ['clean'],
      ],
    },
  });

  // Dışarıdan gelen value değiştiğinde editor içeriğini güncelle
  useEffect(() => {
    if (quill && value !== quill.root.innerHTML) {
      quill.root.innerHTML = value || '';
    }
  }, [quill, value]);

  // Editör içeriği değiştiğinde dışarıya bildir
  useEffect(() => {
    if (!quill) return;
    const handler = () => {
      const html = quill.root.innerHTML;
      onChange(html);
    };
    quill.on('text-change', handler);
    return () => {
      quill.off('text-change', handler);
    };
  }, [quill, onChange]);

  return (
    <div className={className}>
      <div ref={quillRef} />
    </div>
  );
}
