import type { ClassValue } from "clsx";
import { cn, isNotNull } from "~/utils/utils";
import { PopoverDialog, type PopoverRef } from "../../popoverDialog";
import { useRef, useState } from "react";
import { importGamesFromJson, type GameData } from "./parse";
import type { Console } from "@prisma/client";
import { Spinner } from "../../spinner";
import { api } from "~/trpc/react";

export const ImportJSONDialog = ({
  classNames,
  consoleType,
}: {
  classNames?: { dialog?: ClassValue; button?: ClassValue };
  consoleType: Console;
}) => {
  const popoverRef = useRef<PopoverRef>(null);

  const utils = api.useUtils();

  const [gameData, setGameData] = useState<GameData | null>(null);

  const [err, setErr] = useState<string | null>(null);

  const [deselected, setDeselected] = useState<string[]>([]);
  const [inQueue, setInQueue] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [erroredOut, setErroredOut] = useState<string[]>([]);

  const [isUploading, setIsUploading] = useState(false);

  const [abortController, setAborter] = useState<AbortController>(
    new AbortController(),
  );

  const importBatch = api.games.importBatch.useMutation();

  const startUpload = async () => {
    if (!gameData) return;
    setIsUploading(true);
    popoverRef.current?.disableAutoHide();
    const batchSize = 200;
    const queue = gameData.data
      .map((q) => (deselected.includes(q.key) ? null : q.key))
      .map((q) => (q === null ? q : gameData.data.find((z) => z.key === q)))
      .filter(isNotNull)
      .toSorted((a, b) => {
        if (!a.parent_id) {
          if (b.parent_id) return -1;
          return 0;
        }
        if (b.parent_id) return 0;
        return 1;
      });
    let batchNum = 1;
    console.log("Batch #", batchNum);

    while (queue.length > 0) {
      const curBatch = queue.splice(0, batchSize);
      console.log(curBatch);
      setInQueue(queue.map(({ key }) => key));
      const curBKeys = curBatch.map(({ key }) => key);
      setUploading(curBKeys);
      try {
        await importBatch.mutateAsync(curBatch);
      } catch (e) {
        const err = e as Error;
        console.warn(err);
        abortController.abort(err);
        setErroredOut(curBKeys);
        break;
      }

      batchNum++;
      setUploaded((p) => [...p, ...curBKeys]);
      if (abortController.signal.aborted) {
        console.warn("Aborted! Stopping upload");
        break;
      }
    }
    setIsUploading(false);
    setInQueue([]);
    setUploading([]);
    popoverRef.current?.enableAutoHide();
    console.log("Finished!");
    void utils.games.invalidate();
  };

  return (
    <>
      <PopoverDialog
        hideBehavior="manual"
        standalone={".root"}
        className={cn("max-w-[90vw] min-w-[25%]", classNames?.dialog)}
        Actuator={
          <button
            type="button"
            className={cn(
              "cursor-pointer rounded-lg border-1 border-(--complement-300)",
              "px-2 py-1 hover:border-(--complement-400)",
              "hover:backdrop-brightness-(--bg-hover-brightness)",
              "text-(--complement-500)",
            )}
            onClick={async () => {
              setGameData(null);
              setUploaded([]);
              setUploading([]);
              setInQueue([]);
              setErroredOut([]);
              setDeselected([]);
              setAborter(new AbortController());
              setErr(null);
              try {
                const games = await importGamesFromJson(consoleType);
                if (games) {
                  setGameData(games);
                } else
                  throw new Error(
                    "There was an error parsing the file! Check the console for more information",
                  );
              } catch (e) {
                const err: Error = e as Error;
                console.error("Error parsing JSON data: ", err);
                setErr(err.message);
              }
            }}
          >
            Import JSON
          </button>
        }
        ref={popoverRef}
      >
        {err && (
          <>
            <div className="text-(--error-text)">{err}</div>
            <div className="mt-2 flex w-full justify-around">
              <button
                type="button"
                className={cn(
                  "rounded-lg border-1 border-(--button-submit-border) bg-(--button-submit-bg) px-2 py-1 text-(--button-submit-text)",
                  "cursor-pointer hover:brightness-(--bg-hover-brightness)",
                )}
                onClick={(e) => {
                  popoverRef.current?.getActuator()?.props.onClick?.(e);
                }}
              >
                Retry
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg border-1 border-(--button-remove-border) bg-(--button-remove-bg) px-2 py-1 text-(--button-remove-text)",
                  "cursor-pointer hover:brightness-(--bg-hover-brightness)",
                )}
                onClick={() => {
                  popoverRef.current?.hide();
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
        {!err && !gameData && <>Loading the file</>}
        {!err && gameData && (
          <>
            <div className="text-center text-xl text-(--header-text)">
              Parse result
            </div>
            <div className="flex max-h-[50vh] flex-wrap gap-2 overflow-y-auto">
              {!isUploading && (
                <>
                  {gameData.warns.length > 0 && (
                    <>
                      <div className="basis-full text-(--notice-500)">
                        WARNS ({gameData.warns.length}):{" "}
                        <button
                          onClick={() => {
                            gameData.warns.forEach((res) => {
                              if (!res.potentialFixes) return;
                              const ignore = res.potentialFixes.find(
                                (q) => q.label === "Ignore",
                              );
                              if (!ignore) return; // cannot ignore
                              if (
                                res.potentialFixes.filter(
                                  (q) => q.label !== "Ignore",
                                ).length > 0
                              )
                                return; // there are non-ingore options
                              setGameData((p) => (!p ? p : ignore.resolve(p)));
                            });
                          }}
                          className="cursor-pointer rounded-xl border-1 px-2 py-1 hover:backdrop-brightness-(--bg-hover-brightness)"
                        >
                          Ignore non-solvable
                        </button>
                        <button
                          onClick={() => {
                            gameData.warns.forEach((res) => {
                              if (!res.potentialFixes) return;
                              const ignore = res.potentialFixes.find(
                                (q) => q.label === "Ignore",
                              );
                              if (!ignore) return; // cannot ignore
                              setGameData((p) => (!p ? p : ignore.resolve(p)));
                            });
                          }}
                          className="cursor-pointer rounded-xl border-1 px-2 py-1 hover:backdrop-brightness-(--bg-hover-brightness)"
                        >
                          Ignore all
                        </button>
                      </div>
                    </>
                  )}
                  {gameData.warns.map((warn) => (
                    <div
                      id={warn.data.key}
                      key={warn.data.key}
                      className={cn(
                        "flex-1 rounded-xl border-1 border-(--notice-600) bg-(--notice-500)/10",
                        "relative px-2 py-1 pb-4 text-center text-nowrap text-(--notice-500)",
                      )}
                    >
                      {warn.message}
                      <br />
                      <div className="relative block pl-2 text-left text-sm">
                        ID:
                        {(warn.data.id ?? "undefined") || (
                          <span className="text-(--error-text)">*empty*</span>
                        )}
                        <br />
                        Title:
                        {(warn.data.title ?? "undefined") || (
                          <span className="text-(--error-text)">*empty*</span>
                        )}
                        <br /> Warn: {warn.data.region ?? "undefined"}
                      </div>
                      {warn.potentialFixes &&
                        warn.potentialFixes.length > 0 && (
                          <div className="absolute right-2 bottom-2 float-right flex gap-2 text-xs">
                            {warn.potentialFixes.map((fix) => {
                              return (
                                <button
                                  className="cursor-pointer rounded-xl border-1 border-green-500 px-2 py-1 text-green-500 hover:backdrop-brightness-(--bg-hover-brightness)"
                                  key={fix.label}
                                  onClick={() => {
                                    const nGD = fix.resolve(gameData);
                                    setGameData(nGD);
                                  }}
                                >
                                  {fix.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  ))}
                  {gameData.data.length > 0 && (
                    <div className="basis-full text-(--info-500)">
                      CORRECT DATA ({gameData.data.length}):
                    </div>
                  )}
                  {gameData.data.map((data, i) => (
                    <button
                      type={"button"}
                      key={data.key}
                      id={data.key}
                      className={cn(
                        "flex-1 basis-[fit-content] rounded-xl border-1 border-(--info-600) bg-(--info-500)/10",
                        "block cursor-pointer px-2 py-1 text-center text-(--info-500)",
                        "disabled:cursor-default",
                        deselected.includes(data.key) &&
                          "border-(--muted-600) bg-(--muted-500)/10 text-(--muted-500)",
                        uploaded.includes(data.key) &&
                          "border-green-500 bg-green-500/10 text-green-300",
                        erroredOut.includes(data.key) &&
                          "border-red-500 bg-red-500/10 text-red-300",
                      )}
                      onClick={() => {
                        setDeselected((q) => {
                          if (q.includes(data.key))
                            return q.filter((z) => z !== data.key);
                          return [...q, data.key];
                        });
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setDeselected((q) => {
                          const toToggle = gameData.data
                            .filter((_, qi) => qi <= i)
                            .map(({ key }) => key);
                          if (q.includes(data.key)) {
                            return q.filter((z) => !toToggle.includes(z));
                          } else {
                            return [...q, ...toToggle];
                          }
                        });
                      }}
                      disabled={isUploading}
                    >
                      <div className="block pl-2 text-left text-sm">
                        {data.title}
                        <br />
                        {data.id}
                        {data.parent_id && <>[{data.parent_id}]</>}{" "}
                        {data.console} / {data.region}
                      </div>
                      {inQueue.includes(data.key) && (
                        <div className="flex gap-4">
                          Queued{" "}
                          <Spinner
                            className="h-6 w-6"
                            key={data.key + "_spinner"}
                          />
                        </div>
                      )}
                      {uploading.includes(data.key) && (
                        <div className="flex">
                          Uploading{" "}
                          <Spinner
                            className="h-6 w-6"
                            key={data.key + "_spinner"}
                          />
                        </div>
                      )}
                    </button>
                  ))}
                </>
              )}
              {isUploading && (
                <div className="relative mx-5 min-w-64 overflow-hidden rounded-full border-1 border-(--regular-border) px-2">
                  <div
                    className="rouned-full absolute top-0 left-0 h-full bg-green-500/50"
                    style={{
                      width: `${(uploaded.length / gameData.data.length) * 100}%`,
                    }}
                  ></div>
                  Uploading {uploaded.length}/{gameData.data.length} (
                  {Math.round(
                    (uploaded.length / gameData.data.length) * 10000,
                  ) / 100}
                  %)
                </div>
              )}
            </div>
            <div className="mt-2 flex gap-4">
              <button
                className={cn(
                  "w-full rounded-xl bg-(--button-submit-bg)/50 text-(--button-submit-text)",
                  "cursor-pointer border-1 border-(--button-submit-bg) hover:brightness-(--bg-hover-brightness)",
                  "disabled:bg-(--button-muted-bg)/50 disabled:text-(--button-muted-text)",
                  "disabled:cursor-not-allowed disabled:border-(--button-muted-bg) disabled:hover:brightness-100",
                )}
                onClick={() => {
                  void startUpload();
                }}
                disabled={gameData.warns.length > 0}
                type="button"
                title={
                  gameData.warns.length > 0
                    ? "Resolve all issues before importing!"
                    : ""
                }
              >
                {isUploading ? "Uploading... " : "Upload to DB"}
              </button>
              <button
                className={cn(
                  "basis-[30%] cursor-pointer rounded-xl",
                  "border-1 border-(--button-remove-bg) bg-(--button-remove-bg)/50 text-(--button-remove-text)",
                  "hover:brightness-(--bg-hover-brightness)",
                )}
                type="button"
                onClick={() => {
                  if (!isUploading) {
                    popoverRef.current?.hide();
                    setGameData(null);
                  } else {
                    abortController.abort("User abort");
                  }
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </PopoverDialog>
    </>
  );
};
