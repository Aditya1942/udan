import { Link } from 'react-router';
import markUrl from '../assets/brand/udan-mark.png';
import wordmarkUrl from '../assets/brand/udan-wordmark.png';
import { business } from '../content/business';
import './Logo.css';

type LogoProps = {
  /** 'onDark' places the logo on a white plate so it stays legible on Deep Teal. */
  variant?: 'default' | 'onDark';
  size?: 'md' | 'lg';
  className?: string;
};

/** Original visiting-card logo (mark + wordmark), linking to home. Intrinsic sizes keep proportions. */
export function Logo({ variant = 'default', size = 'md', className }: LogoProps) {
  const classes = ['logo', `logo--${size}`, variant === 'onDark' && 'logo--on-dark', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Link to="/" className={classes} aria-label={`${business.name}, home`}>
      <img className="logo__mark" src={markUrl} width={241} height={284} alt="" />
      <img className="logo__wordmark" src={wordmarkUrl} width={416} height={131} alt="" />
    </Link>
  );
}
