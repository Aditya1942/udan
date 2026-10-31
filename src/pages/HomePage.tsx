import { usePageMeta } from '../hooks/usePageMeta';
import { HomeContact } from './home/HomeContact';
import { HomeDestinations } from './home/HomeDestinations';
import { HomeHero } from './home/HomeHero';
import { HomeOtherServices } from './home/HomeOtherServices';
import { HomeServices } from './home/HomeServices';
import { HomeSteps } from './home/HomeSteps';
import { HomeVisa } from './home/HomeVisa';
import { HomeWhy } from './home/HomeWhy';
import './HomePage.css';

export default function HomePage() {
  usePageMeta({
    description:
      'UDAN Immigration & Tours in Vastrapur, Ahmedabad: international and domestic tours, visa and passport guidance, flight and train tickets, hotels, travel insurance, currency exchange and corporate travel.',
  });
  return (
    <>
      <HomeHero />
      <HomeServices />
      <HomeDestinations />
      <HomeVisa />
      <HomeOtherServices />
      <HomeWhy />
      <HomeSteps />
      <HomeContact />
    </>
  );
}
