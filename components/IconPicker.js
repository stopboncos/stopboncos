export const ICON_GROUPS = [
  { label: 'Semua', icons: [
    // Makanan & Minuman
    '🍔','🍕','🍜','🍱','🍚','🍝','🥗','🍣','🎂','🍰','🧁','🍩','🍪','🥐','🥪','🌭','🌮','🌯',
    '☕','🍵','🧃','🥤','🧋','🍺','🍷','🍸','🧊','👕','👗','👔',
    // Fashion & Aksesoris
    '👠','👟','👜','🎒','🕶️','⌚','💍','👑','🧢','🧣','🧤','👞','💄','💅','🧴','🧼','🧽','🧻',
    // Kesehatan & Elektronik
    '💊','💉','🩺','🏥','📱','💻','⌨️','🖱️','🖥️','📷','📸','🎥','📹','🎧',
    // Rumah & Utilitas
    '⏰','📡','🔌','🔋','💡','🏠','🏡','🏢','🏭','🛋️','🛏️','🪑','🚪','🪟','🧺','🧹','🔑','🛁','🚿','🚽',
    // Transportasi
    '🚕','🚌','🚎','🏍️','🚲','🛵','✈️','🚁','🚂','🚆','🚇','🚢','⛽','🅿️','💼','📊','📈','📉','📝','📄','📋','📁','📂','📅','📆','🗓️','📌',
    // Alat Tulis & Olahraga
    '✂️','📏','📐','📚','📖','📕','📗','📘','📙','📓','✏️','🖊️','🖋️','🖍️','📃','🎓',
    '⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏸','🏓','🏑',
    // Hiburan & Olahraga
    '🏒','🥊','🥋','🏋️','🤸','🧘','🎬','🎭','🎨','🎪','🎡','🎢','🎰','🎲','🧩','🎯','🎳','🎮','🕹️','🎸','🎹','🎺','🎻','🥁',
    // Hewan
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆',
    // Alat
    '🔨','🔧','🪛','🔩','⚙️','🛠️','⛏️','🪓','🔪','🗡️','⚔️','🏗️','🧱','🪜',
    // Keluarga & Perayaan
    '👧','👦','🧒','👩','🧓','👴','👵','👨‍👩‍👧','📦','🎁','🎀','🎈','🎉','🎊','✨','⭐','🌟','💫','🔥','💧','⚡','☀️','🌙','🌠',
  ]}
]

export const findGroupForIcon = (icon) => 0

export function IconPicker({ selectedIcon, onSelect }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '8px',
      maxHeight: '200px', overflowY: 'auto',
      padding: '10px', border: '1px solid var(--border)',
      borderRadius: '10px', background: 'white',
    }}>
      {ICON_GROUPS[0].icons.map(icon => (
        <div
          key={icon}
          onClick={() => onSelect(icon)}
          style={{
            width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            border: '1px solid',
            borderColor: selectedIcon === icon ? 'var(--primary)' : 'var(--border)',
            background: selectedIcon === icon ? 'var(--primary-light)' : 'transparent',
            transition: 'all 0.1s',
          }}
        >{icon}</div>
      ))}
    </div>
  )
}