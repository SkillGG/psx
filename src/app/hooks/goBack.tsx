import { useRouter, useSearchParams } from "next/navigation";

export const useGoBack = () => {
  const router = useRouter();
  const params = useSearchParams();

  const back = params.get("back") ?? "/";

  return {
    backParam: back === "/" ? "" : `?back=${back}`,
    goBack: (force?: string) => {
      router.replace(force ?? back);
    },
  };
};
