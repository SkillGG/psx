import { GameList } from "./_components/gameList";
import { UserNav } from "./_components/userNav";

export const Main = () => {
  return (
    <>
      <UserNav className="h-10" />
      <div className="h-[calc(100lvh-40px)] w-full">
        <GameList />
      </div>
    </>
  );
};
