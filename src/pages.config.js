import Dashboard from './pages/Dashboard';
import Trades from './pages/Trades';
import Goals from './pages/Goals';
import Strategies from './pages/Strategies';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Trades": Trades,
    "Goals": Goals,
    "Strategies": Strategies,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};