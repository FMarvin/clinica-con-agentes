import { Heart } from "lucide-react";

const Logo = () => {
  return (
    <div className="flex items-center gap-2 text-primary">
      <Heart aria-hidden="true" className="h-8 w-8" />
      <span className="text-xl font-semibold">Clínicas</span>
    </div>
  );
}

export default Logo;