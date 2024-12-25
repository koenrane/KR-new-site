import { setupDarkMode } from "./darkmode"
import { setupHamburgerMenu } from "./hamburgerMenu"
import { setupScrollHandler } from "./scrollHandler"
import { setupSearch } from "./search"

setupDarkMode()
setupHamburgerMenu()
setupSearch()
setupScrollHandler() // Mobile: hide navbar on scroll down, show on scroll up
