import { MessageCircle } from "lucide-react";

export default function WhatsAppButton() {
  const phoneNumber = "963937938856"; // +963 937 938 856 without spaces or special characters
  const message = "مرحباً! أرغب في الاستفسار عن خدماتكم"; // Default message in Arabic
  
  const handleClick = () => {
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 left-6 z-50 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full p-4 shadow-2xl hover:shadow-[#25D366]/50 transition-all duration-300 hover:scale-110 group"
      aria-label="تواصل معنا عبر واتساب"
      data-testid="whatsapp-button"
    >
      <MessageCircle className="w-7 h-7 group-hover:animate-bounce" />
      
      {/* Tooltip */}
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#3E2723] text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
        تواصل معنا عبر واتساب
      </span>
      
      {/* Pulse effect */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20"></span>
    </button>
  );
}
