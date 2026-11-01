import { Link } from 'react-router';
import markUrl from '../../assets/brand/udan-mark.png';
import wordmarkUrl from '../../assets/brand/udan-wordmark.png';

/** UDAN logo linking to the admin dashboard. */
export function Brand() {
  return (
    <Link to="/admin" className="adm-brand" aria-label="UDAN admin, dashboard">
      <img src={markUrl} width={241} height={284} alt="" className="adm-brand__mark" />
      <img src={wordmarkUrl} width={416} height={131} alt="" className="adm-brand__word" />
    </Link>
  );
}
