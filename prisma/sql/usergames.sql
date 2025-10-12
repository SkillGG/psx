-- @param {String} $1:userId Id of the user whose games should be shown first
-- @param {Int} $2:take
-- @param {Int} $3:skip
SELECT "g"."id", "g"."console", "g"."title" FROM "public"."Game" as "g"
LEFT JOIN "public"."Library" as "l" on "l"."gameId" = "g"."id"
order by case when ("l"."userId" = $1) then 1 else 2 end asc,
"g"."title" asc limit $2 offset $3;