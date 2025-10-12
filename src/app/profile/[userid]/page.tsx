import { UserNav } from "~/app/_components/userNav";
import { ProfilePage } from "./userProfile";

const Page = async ({ params }: PageProps<"/profile/[userid]">) => {
  const profile = await params;

  return (
    <>
      <UserNav className="h-10" />
      <div className="overlow-hidden h-[calc(100lvh-40px)]">
        <ProfilePage user={profile.userid} />
      </div>
    </>
  );
};

export default Page;
