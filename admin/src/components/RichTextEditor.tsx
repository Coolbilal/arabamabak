import { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import { Plus, X, ChevronDown } from 'lucide-react';
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

  const [accordionModal, setAccordionModal] = useState<{ open: boolean; index: number } | null>(null);
  const [accordionTitle, setAccordionTitle] = useState('');
  const [accordionContent, setAccordionContent] = useState('');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Quill instance
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
    if (value) editor.root.innerHTML = value;

    const handler = () => {
      if (isExternalUpdateRef.current) return;
      onChangeRef.current(editor.root.innerHTML);
    };
    editor.on('text-change', handler);

    return () => {
      editor.off('text-change', handler);
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = quillRef.current;
    if (!editor) return;
    if (value === editor.root.innerHTML) return;
    isExternalUpdateRef.current = true;
    editor.root.innerHTML = value || '';
    setTimeout(() => {
      isExternalUpdateRef.current = false;
    }, 0);
  }, [value]);

  // Accordion ekle (cursor pozisyonuna)
  function insertAccordion() {
    if (!accordionTitle.trim() || !accordionContent.trim()) {
      alert('Başlık ve içerik gerekli');
      return;
    }
    const editor = quillRef.current;
    if (!editor) return;

    const html = `<details class="bb-accordion"><summary>${escapeHtml(accordionTitle)}</summary><div class="bb-accordion-body">${accordionContent}</div></details><p><br></p>`;

    const range = editor.getSelection(true);
    editor.insertEmbed(range.index, 'html', html, 'user');
    editor.setSelection(range.index + html.length, 0);

    // State'i güncelle (onChange tetikle)
    setTimeout(() => {
      onChangeRef.current(editor.root.innerHTML);
    }, 0);

    // Modal'ı kapat
    setAccordionTitle('');
    setAccordionContent('');
    setAccordionModal(null);
  }

  return (
    <div className={className}>
      {/* Özel toolbar (Quill'in altında) */}
      <div className="flex items-center gap-2 border-x border-slate-300 border-b-0 px-3 py-2 bg-slate-50">
        <span className="text-xs text-slate-600">Hızlı Ekle:</span>
        <button
          type="button"
          onClick={() => setAccordionModal({ open: true, index: 0 })}
          className="inline-flex items-center gap-1 text-xs bg-white border border-slate-300 hover:bg-slate-100 px-2 py-1 rounded"
        >
          <Plus className="h-3 w-3" /> Accordion (Açılır/Kapanır Başlık)
        </button>
      </div>

      <div ref={containerRef} className="border-x border-b border-slate-300" />

      {/* Accordion Modal */}
      {accordionModal?.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ChevronDown className="h-5 w-5" />
                Accordion Ekle
              </h2>
              <button
                type="button"
                onClick={() => {
                  setAccordionModal(null);
                  setAccordionTitle('');
                  setAccordionContent('');
                }}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Kullanıcı başlığa tıklayınca içerik açılır. Birden fazla ekleyebilirsin.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Başlık *</label>
                <input
                  type="text"
                  value={accordionTitle}
                  onChange={(e) => setAccordionTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Örn: 1. Üye Olun"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">İçerik *</label>
                <textarea
                  value={accordionContent}
                  onChange={(e) => setAccordionContent(e.target.value)}
                  rows={6}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                  placeholder="HTML kullanabilirsin:&#10;<p>Paragraf</p>&#10;<ul><li>Madde 1</li><li>Madde 2</li></ul>&#10;<strong>Kalın</strong>, <em>italik</em>"
                />
                <p className="text-xs text-slate-500 mt-1">
                  HTML etiketleri kullanabilirsin: &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a href="..."&gt;
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setAccordionModal(null);
                  setAccordionTitle('');
                  setAccordionContent('');
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={insertAccordion}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
