"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";

interface TeamManagementProps {
  workspaceId: string;
}

const brutalIn = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.1 } } };

export function TeamManagement({ workspaceId }: TeamManagementProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "editor" | "viewer">("editor");

  const { data: members, refetch: refetchMembers } = trpc.workspaces.membersList.useQuery(undefined, {
    enabled: !!workspaceId,
  });

  const { data: pendingInvites, refetch: refetchInvites } = trpc.workspaces.pendingInvites.useQuery(undefined, {
    enabled: !!workspaceId,
  });

  const inviteMutation = trpc.workspaces.membersInvite.useMutation({
    onSuccess: () => {
      toast.success("Team member invited.");
      setInviteEmail("");
      refetchInvites();
    },
    onError: (err) => toast.error(err.message || "Failed to invite team member."),
  });

  const updateRoleMutation = trpc.workspaces.membersUpdateRole.useMutation({
    onSuccess: () => {
      toast.success("Team member role updated.");
      refetchMembers();
    },
  });

  const removeMemberMutation = trpc.workspaces.membersRemove.useMutation({
    onSuccess: () => {
      toast.success("Team member removed.");
      refetchMembers();
    },
  });

  const revokeInviteMutation = trpc.workspaces.revokeInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked.");
      refetchInvites();
    },
  });

  return (
    <motion.div variants={brutalIn} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_#000]">
      <h2 className="text-3xl font-black uppercase tracking-tighter border-b-4 border-black pb-4 mb-8 flex items-center gap-3">
        <Users className="w-8 h-8" /> TEAM MEMBERS
      </h2>
      
      <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-12 bg-gray-100 border-2 border-black p-4">
        <input
          type="email" placeholder="email@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
          className="brutal-input flex-1"
        />
        <select
          value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}
          className="brutal-input w-full lg:w-48 appearance-none"
        >
          <option value="admin">ADMIN</option>
          <option value="editor">EDITOR</option>
          <option value="analyst">ANALYST</option>
          <option value="viewer">VIEWER</option>
        </select>
        <button
          onClick={() => { if (inviteEmail) inviteMutation.mutate({ email: inviteEmail, role: inviteRole }); }}
          disabled={inviteMutation.isPending || !inviteEmail}
          className="brutal-btn-primary w-full lg:w-auto"
        >
          SEND INVITE
        </button>
      </div>

      <div className="space-y-4">
        {members?.map((member) => (
          <div key={member.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border-2 border-black bg-white hover:bg-gray-50">
            <div className="w-full sm:w-auto mb-4 sm:mb-0">
              <p className="font-black text-lg uppercase tracking-tight">{member.user.fullName}</p>
              <p className="text-xs font-mono font-bold bg-gray-200 px-2 py-1 inline-block mt-1">{member.user.email}</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {member.role === "owner" ? (
                <span className="text-xs uppercase tracking-widest font-black bg-[var(--caution)] px-3 py-1 border-2 border-black">OWNER</span>
              ) : (
                <>
                  <select
                    value={member.role} onChange={(e) => updateRoleMutation.mutate({ memberId: member.id, role: e.target.value as any })}
                    className="bg-transparent border-2 border-gray-300 p-2 text-xs uppercase tracking-widest font-black cursor-pointer hover:border-black"
                  >
                    <option value="admin">ADMIN</option>
                    <option value="editor">EDITOR</option>
                    <option value="analyst">ANALYST</option>
                    <option value="viewer">VIEWER</option>
                  </select>
                  <button
                    className="bg-red-100 text-red-600 border-2 border-red-200 p-2 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                    onClick={() => { if (confirm("REMOVE THIS MEMBER?")) removeMemberMutation.mutate({ memberId: member.id }); }}
                    title="REMOVE ACCESS"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {pendingInvites?.map((invite) => (
          <div key={invite.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border-2 border-dashed border-gray-400 bg-gray-50">
            <div className="w-full sm:w-auto mb-4 sm:mb-0">
              <div className="flex items-center gap-2">
                <p className="font-black text-lg uppercase tracking-tight text-gray-500">PENDING INVITE</p>
                <span className="bg-yellow-200 text-yellow-800 text-[10px] uppercase font-black px-2 py-0.5">Pending</span>
              </div>
              <p className="text-xs font-mono font-bold bg-white px-2 py-1 inline-block mt-1 border border-gray-300">{invite.email}</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs uppercase tracking-widest font-black bg-gray-200 text-gray-600 px-3 py-1 border-2 border-gray-300">{invite.role}</span>
              <button
                className="bg-gray-100 text-gray-600 border-2 border-gray-300 p-2 hover:bg-gray-600 hover:text-white hover:border-gray-600 transition-colors"
                onClick={() => { if (confirm("REVOKE THIS INVITATION?")) revokeInviteMutation.mutate({ inviteId: invite.id }); }}
                title="REVOKE INVITATION"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
