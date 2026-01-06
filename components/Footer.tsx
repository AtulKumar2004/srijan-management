export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <div className="text-center md:text-left">
            <h3 className="text-base sm:text-lg font-semibold text-[#A65353]">Srijan</h3>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Serving the community with devotion</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors whitespace-nowrap">
              About Us
            </a>
            <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors whitespace-nowrap">
              Contact
            </a>
            <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors whitespace-nowrap">
              Privacy Policy
            </a>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-3 sm:mt-4 pt-3 sm:pt-4 text-center text-xs sm:text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Srijan. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
