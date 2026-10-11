export default function AccesoDenegado({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-md border border-marca-300 bg-marca-100/30 p-6 text-center">
      <p className="font-medium text-marca-800">{mensaje}</p>
    </div>
  );
}
