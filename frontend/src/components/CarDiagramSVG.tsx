export default function CarDiagramSVG() {
  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src="/diyagram.png"
        alt="Araç diyagramı"
        className="max-w-full h-auto"
        style={{ maxHeight: '500px' }}
      />
      <p className="text-xs text-slate-500">
        Araç parçalarını seçmek için lütfen yöneticinizle iletişime geçin.
      </p>
    </div>
  );
}
