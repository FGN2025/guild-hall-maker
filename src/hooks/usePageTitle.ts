import { useEffect } from "react";

const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = title ? `${title} | FGN Esports` : "FGN Esports";
    return () => {
      document.title = "FGN Esports";
    };
  }, [title]);
};

export default usePageTitle;
