import { NavLink } from 'react-router-dom';
export function RoomNavigation({ id }: { id: string }) {
  const base = '/app/rooms/' + id;
  return <nav className="room-navigation" aria-label="Room navigation">
    <NavLink end to={base}>Arena</NavLink><NavLink to={base + '/audit'}>Audit trail</NavLink>
    <NavLink to={base + '/results'}>Results</NavLink>
  </nav>;
}
