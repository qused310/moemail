"use client"

import { useCallback, useState } from "react"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Github, Loader2, KeyRound, User2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Turnstile } from "@/components/auth/turnstile"

interface TurnstileConfigProps {
  enabled: boolean
  siteKey: string
}

interface LoginFormProps {
  turnstile?: TurnstileConfigProps
}

interface FormErrors {
  username?: string
  password?: string
  confirmPassword?: string
}

export function LoginForm({ turnstile }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileResetCounter, setTurnstileResetCounter] = useState(0)
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const { toast } = useToast()
  const t = useTranslations("auth.loginForm")

  const turnstileSiteKey = turnstile?.siteKey ?? ""
  const turnstileEnabled = Boolean(turnstile?.enabled && turnstileSiteKey)

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("")
    setTurnstileResetCounter((prev) => prev + 1)
  }, [])

  const ensureTurnstileSolved = () => {
    if (!turnstileEnabled) return true
    if (turnstileToken) return true

    toast({
      title: t("toast.turnstileRequired"),
      description: t("toast.turnstileRequiredDesc"),
      variant: "destructive",
    })
    return false
  }

  const clearForm = () => {
    setUsername("")
    setPassword("")
    setConfirmPassword("")
    setErrors({})
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as "login" | "register")
    clearForm()
  }

  const validateLoginForm = () => {
    const newErrors: FormErrors = {}
    if (!username) newErrors.username = t("errors.usernameRequired")
    if (!password) newErrors.password = t("errors.passwordRequired")
    if (username.includes('@')) newErrors.username = t("errors.usernameInvalid")
    if (password && password.length < 8) newErrors.password = t("errors.passwordTooShort")
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateRegisterForm = () => {
    const newErrors: FormErrors = {}
    if (!username) newErrors.username = t("errors.usernameRequired")
    if (!password) newErrors.password = t("errors.passwordRequired")
    if (username.includes('@')) newErrors.username = t("errors.usernameInvalid")
    if (password && password.length < 8) newErrors.password = t("errors.passwordTooShort")
    if (!confirmPassword) newErrors.confirmPassword = t("errors.confirmPasswordRequired")
    if (password !== confirmPassword) newErrors.confirmPassword = t("errors.passwordMismatch")
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async () => {
    if (!validateLoginForm()) return
    if (!ensureTurnstileSolved()) return

    setLoading(true)
    try {
      const result = await signIn("credentials", {
        username,
        password,
        turnstileToken,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: t("toast.loginFailed"),
          description: result.error,
          variant: "destructive",
        })
        setLoading(false)
        resetTurnstile()
        return
      }

      window.location.href = "/"
    } catch (error) {
      toast({
        title: t("toast.loginFailed"),
        description: error instanceof Error ? error.message : t("toast.registerFailedDesc"),
        variant: "destructive",
      })
      setLoading(false)
      resetTurnstile()
    }
  }

  const handleRegister = async () => {
    if (!validateRegisterForm()) return
    if (!ensureTurnstileSolved()) return

    setLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken }),
      })

      const data = await response.json() as { error?: string }

      if (!response.ok) {
        toast({
          title: t("toast.registerFailed"),
          description: data.error || t("toast.registerFailedDesc"),
          variant: "destructive",
        })
        setLoading(false)
        resetTurnstile()
        return
      }

      // 注册成功后自动登录
      const result = await signIn("credentials", {
        username,
        password,
        turnstileToken,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: t("toast.loginFailed"),
          description: result.error || t("toast.autoLoginFailed"),
          variant: "destructive",
        })
        setLoading(false)
        resetTurnstile()
        return
      }

      window.location.href = "/"
    } catch (error) {
      toast({
        title: t("toast.registerFailed"),
        description: error instanceof Error ? error.message : t("toast.registerFailedDesc"),
        variant: "destructive",
      })
      setLoading(false)
      resetTurnstile()
    }
  }

  const handleGithubLogin = () => {
    signIn("github", { callbackUrl: "/" })
  }

  return (
    <Card className="w-[95%] max-w-lg border-2 border-primary/20">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-center bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          {t("title")}
        </CardTitle>
        <CardDescription className="text-center">
          {t("subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">{t("tabs.login")}</TabsTrigger>
            <TabsTrigger value="register">{t("tabs.register")}</TabsTrigger>
          </TabsList>
          <div className="min-h-[220px]">
            <TabsContent value="login" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <User2 className="h-5 w-5" />
                    </div>
                    <Input
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.username && "border-destructive focus-visible:ring-destructive"
                      )}
                      placeholder={t("fields.username")}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value)
                        setErrors({})
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <Input
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.password && "border-destructive focus-visible:ring-destructive"
                      )}
                      type="password"
                      placeholder={t("fields.password")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setErrors({})
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <Button
                  className="w-full"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("actions.login")}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t("actions.or")}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGithubLogin}
                >
                  <Github className="mr-2 h-4 w-4" />
                  {t("actions.githubLogin")}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="register" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <User2 className="h-5 w-5" />
                    </div>
                    <Input
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.username && "border-destructive focus-visible:ring-destructive"
                      )}
                      placeholder={t("fields.username")}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value)
                        setErrors({})
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <Input
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.password && "border-destructive focus-visible:ring-destructive"
                      )}
                      type="password"
                      placeholder={t("fields.password")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setErrors({})
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <Input
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.confirmPassword && "border-destructive focus-visible:ring-destructive"
                      )}
                      type="password"
                      placeholder={t("fields.confirmPassword")}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        setErrors({})
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <Button
                  className="w-full"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("actions.register")}
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        {turnstileEnabled && turnstileSiteKey && (
          <div className={cn("space-y-2", activeTab === "login" ? "mt-4" : "")}>
            <Turnstile
              siteKey={turnstileSiteKey}
              onVerify={setTurnstileToken}
              onExpire={resetTurnstile}
              resetSignal={turnstileResetCounter}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
