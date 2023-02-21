import { useContext } from "react";
import { CommonError } from "@common/errors/common";
import { AdenaContext } from "@common/provider";

export const useAdenaContext = () => {
  const context = useContext(AdenaContext);
  if (context === null) {
    throw new CommonError("FAILED_INITIALIZE_PROVIDER");
  }
  return context;
};
