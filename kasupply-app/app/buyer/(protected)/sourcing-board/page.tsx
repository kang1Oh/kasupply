import { BuyerSourcingBoardPage } from "@/components/buyer-sourcing-board-page";
import { getBuyerSourcingBoardData } from "./actions";

export default async function BuyerSourcingBoardRoute() {
  const data = await getBuyerSourcingBoardData();

  return (
    <BuyerSourcingBoardPage
      buyerBusinessName={data.buyerBusinessName}
      requests={data.requests}
    />
  );
}
