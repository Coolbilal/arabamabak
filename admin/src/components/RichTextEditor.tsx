import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const isExternalUpdateRef = useRef(false);

  // onChange güncel kalsın (stale closure sorunu)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Quill instance'ı sadece 1 kez oluştur
  useEffect(() => {
    if (!containerRef.current) return;

    const editor = new Quill(containerRef.current, {
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

    quillRef.current = editor;

    // İlk değeri yükle
    if (value) {
      editor.root.innerHTML = value;
    }

    // Editör içeriği değiştiğinde dışarıya bildir
    const handler = () => {
      if (isExternalUpdateRef.current) return;
      const html = editor.root.innerHTML;
      onChangeRef.current(html);
    };
    editor.on('text-change', handler);

    return () => {
      editor.off('text-change', handler);
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dışarıdan gelen value değiştiğinde editor içeriğini güncelle
  useEffect(() => {
    const editor = quillRef.current;
    if (!editor) return;
    if (value === editor.root.innerHTML) return;
    isExternalUpdateRef.current = true;
    editor.root.innerHTML = value || '';
    // text-change tetiklendikten sonra flag'i kapat
    setTimeout(() => {
      isExternalUpdateRef.current = false;
    }, 0);
  }, [value]);

  return (
    <div className={className}>
      <div ref={containerRef} />
    </div>
  );
}
