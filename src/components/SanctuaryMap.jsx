const MAP_PAGE = 'https://mapgenie.io/diablo-4/maps/sanctuary#categories'

export default function SanctuaryMap() {
  return (
    <div className="h-full min-h-0 overflow-auto bg-black">
      <iframe
        title="Mapa interactivo de Santuario"
        src={MAP_PAGE}
        className="h-full min-h-full w-full min-w-[960px]"
        allow="fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}
