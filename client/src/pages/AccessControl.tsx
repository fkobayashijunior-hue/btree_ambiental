import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, User, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROFILE_COLORS: Record<string, string> = {
  admin:         "bg-red-100 text-red-800 border-red-200",
  mecanico:      "bg-blue-100 text-blue-800 border-blue-200",
  operador:      "bg-orange-100 text-orange-800 border-orange-200",
  motorista:     "bg-purple-100 text-purple-800 border-purple-200",
  motosserrista: "bg-yellow-100 text-yellow-800 border-yellow-200",
  custom:        "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AccessControl() {
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [pendingModules, setPendingModules] = useState<Record<number, string[]>>({});
  const [pendingProfiles, setPendingProfiles] = useState<Record<number, string>>({});

  const utils = trpc.useUtils();
  const { data: usersList = [], isLoading: loadingUsers } = trpc.permissions.listUsers.useQuery();
  const { data: modulesList = [] } = trpc.permissions.listModules.useQuery();
  const { data: profilesList = [] } = trpc.permissions.listProfiles.useQuery();

  const setPermsMutation = trpc.permissions.setPermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissões salvas!");
      utils.permissions.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar"),
  });

  // Agrupar módulos por grupo
  const groups = (modulesList as Array<{ slug: string; label: string; group: string }>).reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = [];
    acc[m.group].push(m);
    return acc;
  }, {} as Record<string, Array<{ slug: string; label: string; group: string }>>);

  const getUserModules = (userId: number, userModules: string[] | null): string[] => {
    if (pendingModules[userId] !== undefined) return pendingModules[userId];
    return userModules || [];
  };

  const getUserProfile = (userId: number, userProfile: string): string => {
    return pendingProfiles[userId] ?? userProfile;
  };

  const toggleModule = (userId: number, slug: string, currentModules: string[] | null) => {
    const current = getUserModules(userId, currentModules);
    const updated = current.includes(slug)
      ? current.filter(m => m !== slug)
      : [...current, slug];
    setPendingModules(p => ({ ...p, [userId]: updated }));
    setPendingProfiles(p => ({ ...p, [userId]: "custom" }));
  };

  const handleApplyProfile = (userId: number, profileKey: string) => {
    const profile = profilesList.find(p => p.key === profileKey);
    if (!profile) return;
    setPendingProfiles(p => ({ ...p, [userId]: profileKey }));
    if (profileKey === "admin") {
      setPendingModules(p => { const n = { ...p }; delete n[userId]; return n; });
    } else {
      setPendingModules(p => ({ ...p, [userId]: [...profile.modules] }));
    }
  };

  const handleSave = (userId: number, currentModules: string[] | null, currentProfile: string) => {
    const modules = pendingModules[userId] !== undefined ? pendingModules[userId] : currentModules;
    const profile = pendingProfiles[userId] ?? currentProfile;
    const isAdminProfile = profile === "admin";
    setPermsMutation.mutate({
      userId,
      modules: isAdminProfile ? null : (modules || []),
      profile,
    });
    setPendingModules(p => { const n = { ...p }; delete n[userId]; return n; });
    setPendingProfiles(p => { const n = { ...p }; delete n[userId]; return n; });
  };

  const hasPendingChanges = (userId: number) =>
    pendingModules[userId] !== undefined || pendingProfiles[userId] !== undefined;

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Shield className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Controle de Acesso</h1>
          <p className="text-sm text-gray-500">Defina quais módulos cada usuário pode acessar</p>
        </div>
      </div>

      {/* Legenda de perfis */}
      <Card className="border-emerald-100">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-gray-700">Perfis Disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {profilesList.map(p => (
              <div key={p.key} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${PROFILE_COLORS[p.key] || PROFILE_COLORS.custom}`}>
                <span>{p.label}</span>
                <span className="opacity-60">({p.key === "admin" ? "todos" : p.modules.length} módulos)</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <div className="space-y-3">
        {(usersList as any[]).map((user: any) => {
          const isExpanded = expandedUser === user.id;
          const currentProfile = getUserProfile(user.id, user.profile);
          const currentModules = getUserModules(user.id, user.modules);
          const isAdminProfile = currentProfile === "admin" || user.role === "admin";
          const changed = hasPendingChanges(user.id);

          return (
            <Card key={user.id} className={`transition-all ${changed ? "border-emerald-400 shadow-sm" : "border-gray-200"}`}>
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {changed && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                        Alterado
                      </Badge>
                    )}
                    <Badge className={`text-xs border ${PROFILE_COLORS[currentProfile] || PROFILE_COLORS.custom}`}>
                      {profilesList.find(p => p.key === currentProfile)?.label || "Personalizado"}
                    </Badge>
                    {isAdminProfile ? (
                      <Badge className="bg-gray-100 text-gray-600 text-xs">Acesso total</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600 text-xs">{currentModules.length} módulos</Badge>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {/* Seletor de perfil */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Aplicar perfil:</span>
                      <Select
                        value={currentProfile}
                        onValueChange={(val) => handleApplyProfile(user.id, val)}
                      >
                        <SelectTrigger className="h-8 text-sm w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {profilesList.map(p => (
                            <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-gray-400">ou selecione módulos individualmente</span>
                    </div>

                    {/* Módulos por grupo */}
                    {isAdminProfile ? (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Administrador — acesso completo a todos os módulos
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(groups).map(([group, mods]) => (
                          <div key={group}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {mods.map((mod: any) => (
                                <label
                                  key={mod.slug}
                                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                                    currentModules.includes(mod.slug)
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                                  }`}
                                >
                                  <Checkbox
                                    checked={currentModules.includes(mod.slug)}
                                    onCheckedChange={() => toggleModule(user.id, mod.slug, user.modules)}
                                    className="h-4 w-4 flex-shrink-0"
                                  />
                                  <span className="font-medium leading-tight">{mod.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botão salvar */}
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
                        onClick={() => handleSave(user.id, user.modules, user.profile)}
                        disabled={setPermsMutation.isPending}
                      >
                        {setPermsMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Salvar Permissões
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(usersList as any[]).length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Shield className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum usuário encontrado</p>
        </div>
      )}
    </div>
  );
}
