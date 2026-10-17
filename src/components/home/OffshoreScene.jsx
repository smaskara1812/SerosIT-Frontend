import { Swell, Wildcat, WildcatDefs } from '@/components/home/Wildcat'

// The hidden "drill-down" scene for the home banner (the Konami code): the Essar Wildcat, a semi-submersible drilling
// rig, stands moored in the swell while a Seros bulk carrier slows down to pass alongside it. The rig is drawn after the
// fleet photo: big rust-orange columns with a black splash-zone band, diagonal bracing, a dark deck with the name on its
// face, a white accommodation block, a lattice derrick and two blue cranes. Unlike a jack-up it sits on floating
// pontoons, so it stands steady while the ship rocks. Decoration only.


export default function OffshoreScene() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <WildcatDefs />
      </defs>

      <Wildcat x={985} y={330} scale={0.62} />

      {/* Seros bulk carrier, sailing left to right (stern and accommodation on the left, as in the fleet photo) */}
      <g className="boat-sail">
        <g transform="translate(0 316) scale(0.509) translate(0 -326)">
          <g className="boat-bob">
            {/* hull: blue topsides, red below the waterline stripe */}
            <path d="M24,328 L430,328 L452,300 L12,300 Z" fill="#d8574a" />
            <path d="M10,284 L440,284 L458,276 L446,300 L14,300 Z" fill="#1d4fa3" stroke="#9cc0ef" strokeWidth="1.5" strokeOpacity="0.6" />
            <text x="232" y="297" textAnchor="middle" fontSize="15" fontWeight="800" letterSpacing="4" fill="#ffffff" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">SEROS</text>
            {/* cargo hatches and cranes */}
            <g fill="#e07a6b" fillOpacity="0.95">
              <rect x="108" y="276" width="60" height="8" /><rect x="188" y="276" width="60" height="8" /><rect x="268" y="276" width="60" height="8" /><rect x="348" y="276" width="60" height="8" />
            </g>
            <g stroke="#f4f8fd" strokeOpacity="0.95" strokeWidth="2.5" fill="none">
              <line x1="146" y1="276" x2="146" y2="244" /><line x1="226" y1="276" x2="226" y2="244" /><line x1="306" y1="276" x2="306" y2="244" /><line x1="386" y1="276" x2="386" y2="244" />
            </g>
            <g stroke="#f4f8fd" strokeOpacity="0.7" strokeWidth="1.5">
              <line x1="146" y1="244" x2="188" y2="236" /><line x1="226" y1="244" x2="268" y2="236" /><line x1="306" y1="244" x2="348" y2="236" />
            </g>
            <g fill="#d8574a"><rect x="142" y="242" width="8" height="8" /><rect x="222" y="242" width="8" height="8" /><rect x="302" y="242" width="8" height="8" /><rect x="382" y="242" width="8" height="8" /></g>
            {/* accommodation block, bridge, funnel and mast */}
            <rect x="22" y="246" width="70" height="38" fill="#f4f8fd" />
            <rect x="30" y="226" width="54" height="20" fill="#f4f8fd" />
            <rect x="38" y="212" width="38" height="14" fill="#f4f8fd" />
            <g fill="#17356f"><rect x="32" y="232" width="50" height="6" /><rect x="40" y="216" width="34" height="5" /><rect x="30" y="256" width="8" height="6" /><rect x="44" y="256" width="8" height="6" /><rect x="58" y="256" width="8" height="6" /><rect x="72" y="256" width="8" height="6" /></g>
            <rect x="78" y="226" width="9" height="20" fill="#1d4fa3" />
            <line x1="57" y1="212" x2="57" y2="188" stroke="#f4f8fd" strokeWidth="2" /><circle cx="57" cy="186" r="3" fill="#3dbdb0" />
          </g>
        </g>
      </g>

      <Swell />
    </svg>
  )
}
