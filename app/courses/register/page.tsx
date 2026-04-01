'use client';

import PageHeader from '@/components/PageHeader';
import StatusResult from '@/components/StatusResult';

export default function CourseRegisterPage() {
    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />
            <PageHeader title="Course Enrollment" backHref="/courses" />
            <div className="page-content centered">
                <StatusResult
                    success={false}
                    title="Self-Registration Disabled"
                    message="Course enrollment is managed by instructor/admin in the current backend."
                    details="Please contact your instructor/admin to be enrolled."
                    homeHref="/courses"
                />
            </div>
        </main>
    );
}
