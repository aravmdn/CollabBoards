-- Add attachment metadata columns
ALTER TABLE "Attachment" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Attachment" ADD COLUMN "size" INTEGER;
ALTER TABLE "Attachment" ADD COLUMN "uploadedById" TEXT;

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Replace RESTRICT cascade rules so parent deletes succeed cleanly.
ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_userId_fkey";
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_workspaceId_fkey";
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Board" DROP CONSTRAINT "Board_workspaceId_fkey";
ALTER TABLE "Board" ADD CONSTRAINT "Board_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "List" DROP CONSTRAINT "List_boardId_fkey";
ALTER TABLE "List" ADD CONSTRAINT "List_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Card" DROP CONSTRAINT "Card_listId_fkey";
ALTER TABLE "Card" ADD CONSTRAINT "Card_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "List"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" DROP CONSTRAINT "Comment_cardId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "Card"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_cardId_fkey";
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "Card"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
