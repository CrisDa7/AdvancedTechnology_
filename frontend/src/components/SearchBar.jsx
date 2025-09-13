export default function SearchBar({ onSearch }) {
  return (
    <div className="flex rounded-full border border-white/10 bg-white/5 p-2">
      <input
        type="text"
        placeholder="Buscar..."
        className="flex-1 bg-transparent px-4 text-white placeholder-white/70 focus:outline-none"
      />
      <button
        onClick={() => onSearch?.()}
        className="rounded-full px-5 py-2 font-semibold bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-400"
      >
        Buscar
      </button>
    </div>
  );
}
