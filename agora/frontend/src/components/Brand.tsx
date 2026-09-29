export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <span className="agora-brand" aria-hidden="true">
    <img className="agora-mark" src={inverse ? '/brand/agora-mark-inverse.svg' : '/brand/agora-mark.svg'} alt="" width="44" height="44" />
    <span className="agora-name">agora<span className="agora-period">.</span></span>
  </span>;
}
