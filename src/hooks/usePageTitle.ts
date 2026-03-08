import { useEffect } from "react";

const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = title ? `${title} | FGN` : "FGN - Fibre Gaming Network";
    return () => {
      document.title = "FGN - Fibre Gaming Network";
    };
  }, [title]);
};

export default usePageTitle;
